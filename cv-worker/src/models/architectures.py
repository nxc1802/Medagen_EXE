import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from torchvision.models import resnet18, ResNet18_Weights

# ---------------------------------------------------------
# DermNet 23 Classes: Swin Tiny + ConvNeXt Tiny + CBAM
# ---------------------------------------------------------

class CBAMBlock(nn.Module):
    def __init__(self, channels, reduction=16, spatial_kernel=7):
        super(CBAMBlock, self).__init__()
        # Channel attention
        self.channel_att = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(channels, channels // reduction, 1, bias=False),
            nn.ReLU(inplace=True),
            nn.Conv2d(channels // reduction, channels, 1, bias=False),
            nn.Sigmoid()
        )
        # Spatial attention
        self.spatial_att = nn.Sequential(
            nn.Conv2d(2, 1, kernel_size=spatial_kernel, padding=spatial_kernel // 2, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        # Channel attention
        ca = self.channel_att(x)
        x = x * ca
        # Spatial attention
        sa = torch.cat([
            torch.mean(x, dim=1, keepdim=True), 
            torch.max(x, dim=1, keepdim=True)[0]
        ], dim=1)
        sa = self.spatial_att(sa)
        x = x * sa
        return x

class ViTCNNHybrid(nn.Module):
    def __init__(self, num_classes, use_cbam=True):
        super(ViTCNNHybrid, self).__init__()
        
        self.vit = timm.create_model(
            'swin_tiny_patch4_window7_224', pretrained=False, num_classes=0, drop_rate=0.3
        )
        self.vit_out_features = 768
        
        # ConvNeXt-Tiny
        self.cnn = timm.create_model(
            'convnext_tiny', pretrained=False, num_classes=0, drop_rate=0.3, global_pool=''
        )
        self.cnn_out_features = 768
        self.cnn_pool = nn.AdaptiveAvgPool2d((7, 7))
        
        # Gates
        self.vit_gate = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(self.vit_out_features, self.vit_out_features // 16, 1),
            nn.ReLU(inplace=True),
            nn.Conv2d(self.vit_out_features // 16, self.vit_out_features, 1),
            nn.Sigmoid()
        )
        self.cnn_gate = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(self.cnn_out_features, self.cnn_out_features // 16, 1),
            nn.ReLU(inplace=True),
            nn.Conv2d(self.cnn_out_features // 16, self.cnn_out_features, 1),
            nn.Sigmoid()
        )
        
        self.match_dim = nn.Conv2d(self.vit_out_features, self.cnn_out_features, 1)
        
        # Learnable α for dynamic fusion
        self.alpha_param = nn.Parameter(torch.tensor(0.5))
        
        # Fusion
        fusion_layers = [
            nn.Conv2d(self.cnn_out_features, 256, kernel_size=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3)
        ]
        if use_cbam:
            fusion_layers.append(CBAMBlock(256))
        fusion_layers.append(nn.AdaptiveAvgPool2d((1, 1)))
        self.fusion = nn.Sequential(*fusion_layers)
        
        # FC
        self.fc = nn.Sequential(
            nn.Linear(256, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        # ViT branch
        vit_out = self.vit(x)
        vit_out = vit_out.view(-1, self.vit_out_features, 1, 1).expand(-1, -1, 7, 7)
        vit_out = vit_out * self.vit_gate(vit_out)
        
        # CNN branch
        cnn_out = self.cnn(x)
        cnn_out = self.cnn_pool(cnn_out)
        cnn_out = cnn_out * self.cnn_gate(cnn_out)
        
        # Dynamic Fusion
        alpha = torch.sigmoid(self.alpha_param)
        combined = alpha * vit_out + (1 - alpha) * cnn_out
        
        combined = self.fusion(combined)
        combined = combined.view(combined.size(0), -1)
        out = self.fc(combined)
        return out

# ---------------------------------------------------------
# Teeth and Nail Models: CBAMResNet18
# ---------------------------------------------------------

class ChannelAttention(nn.Module):
    def __init__(self, in_planes, ratio=16):
        super(ChannelAttention, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        
        # Safe ratio for small channels
        safe_ratio = ratio if in_planes >= ratio else 1
        
        self.fc1 = nn.Conv2d(in_planes, in_planes // safe_ratio, 1, bias=False)
        self.relu1 = nn.ReLU()
        self.fc2 = nn.Conv2d(in_planes // safe_ratio, in_planes, 1, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = self.fc2(self.relu1(self.fc1(self.avg_pool(x))))
        max_out = self.fc2(self.relu1(self.fc1(self.max_pool(x))))
        return self.sigmoid(avg_out + max_out)

class SpatialAttention(nn.Module):
    def __init__(self, kernel_size=7):
        super(SpatialAttention, self).__init__()
        self.conv1 = nn.Conv2d(2, 1, kernel_size, padding=kernel_size//2, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        x = torch.cat([avg_out, max_out], dim=1)
        return self.sigmoid(self.conv1(x))

class CBAMModule(nn.Module):
    def __init__(self, in_planes, ratio=16, kernel_size=7):
        super(CBAMModule, self).__init__()
        self.ca = ChannelAttention(in_planes, ratio)
        self.sa = SpatialAttention(kernel_size)

    def forward(self, x):
        out = x * self.ca(x)
        out = out * self.sa(out)
        return out

class CBAMResNet18(nn.Module):
    def __init__(self, num_classes):
        super(CBAMResNet18, self).__init__()
        # Load ResNet18 (without pretrained weights since we'll load from checkpoint)
        self.backbone = resnet18(weights=None)
        
        # ResNet18 channel configs: 64, 128, 256, 512
        self.cbam1 = CBAMModule(64)
        self.cbam2 = CBAMModule(128)
        self.cbam3 = CBAMModule(256)
        self.cbam4 = CBAMModule(512)
        
        # Classifier
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(512, num_classes)

    def forward(self, x):
        # Stem
        x = self.backbone.conv1(x)
        x = self.backbone.bn1(x)
        x = self.backbone.relu(x)
        x = self.backbone.maxpool(x)

        # Layer 1 + CBAM
        x = self.backbone.layer1(x)
        x = self.cbam1(x)

        # Layer 2 + CBAM
        x = self.backbone.layer2(x)
        x = self.cbam2(x)

        # Layer 3 + CBAM
        x = self.backbone.layer3(x)
        x = self.cbam3(x)

        # Layer 4 + CBAM
        x = self.backbone.layer4(x)
        x = self.cbam4(x)

        # Head
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.fc(x)
        return x
