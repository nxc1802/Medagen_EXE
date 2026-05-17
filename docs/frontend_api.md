# Tài liệu Hướng dẫn Tích hợp API cho Frontend

Tài liệu này cung cấp toàn bộ đặc tả kết nối và định dạng dữ liệu API để đội ngũ lập trình viên **Frontend (Next.js)** dễ dàng kết nối, truyền tải hình ảnh y tế, thực hiện chẩn đoán lâm sàng và thiết lập hội thoại thời gian thực (Real-time chat) với **Backend Medagen V2**.

---

## 1. Thông tin Kết nối Chung (Base URL)

Dự án Medagen V2 chạy hai cổng dịch vụ độc lập. Đối với Frontend, bạn sẽ chỉ kết nối trực tiếp đến **Backend Core**:

* **Môi trường Phát triển Local (Development):**
  - **REST API URL:** `http://localhost:3000`
  - **WebSocket URL:** `ws://localhost:3000`
  - **Swagger UI (Interactive API Docs):** `http://localhost:3000/docs`
* **Môi trường Triển khai Production (Hugging Face Spaces):**
  - **REST API URL:** `https://<YOUR-HF-USERNAME>-medagen-backend.hf.space`
  - **WebSocket URL:** `wss://<YOUR-HF-USERNAME>-medagen-backend.hf.space`

---

## 2. Danh sách REST API Endpoints

### 2.1. Đăng ký & Tạo mới cuộc hội thoại (Conversation Session)
Tạo ra một phiên chat đa lượt mới giữa người dùng và Agent.

* **Endpoint:** `POST /api/v1/sessions`
* **Content-Type:** `application/json`
* **Request Body:**
```json
{
  "user_id": "patient-12345"
}
```
* **Response (Success - 201 Created):**
```json
{
  "success": true,
  "session_id": "a9b8c7d6-e5f4-3210-abcd-ef0123456789",
  "created_at": "2026-05-17T09:12:34.567Z"
}
```

---

### 2.2. Gửi yêu cầu Phân loại Lâm sàng mẫu (REST Triage)
Dành cho trường hợp Frontend muốn thực hiện phân loại lâm sàng trực tiếp bằng một request HTTP POST đơn lẻ (Single-turn triage).

* **Endpoint:** `POST /api/v1/triage`
* **Content-Type:** `application/json`
* **Request Body:**
```json
{
  "user_id": "patient-12345",
  "input_text": "Tôi bị nổi mẩn đỏ ngứa nhiều ở mu bàn tay từ hôm qua sau khi làm vườn.",
  "image_url": "https://supabase.co/storage/v1/object/public/symptoms/rash_hand.jpg",
  "location": {
    "lat": 21.028511,
    "lng": 105.804817
  }
}
```
* **Response (Success - 200 OK):**
```json
{
  "success": true,
  "triage_level": "MÀU VÀNG (Cần theo dõi / Khám sớm)",
  "analysis": {
    "suspected_condition": "Viêm da tiếp xúc kích ứng (Irritant Contact Dermatitis)",
    "cv_results": [
      { "name": "Poison Ivy Photos and other Contact Dermatitis", "prob": 0.82 },
      { "name": "Eczema Photos", "prob": 0.12 }
    ],
    "explanation": "Triệu chứng nổi mẩn đỏ xuất hiện đột ngột sau khi tiếp xúc trực tiếp với cây cối/nhựa thực vật trong vườn, phù hợp với tổn thương viêm da tiếp xúc.",
    "recommendations": [
      "Rửa sạch vùng da tiếp xúc bằng nước mát và xà phòng dịu nhẹ lập tức.",
      "Tránh cào gãi làm xước da gây nhiễm trùng thứ phát.",
      "Có thể chườm mát hoặc bôi kem dưỡng dịu da.",
      "Đến cơ sở y tế gần nhất nếu vùng tổn thương lan rộng hoặc xuất hiện mụn nước lớn."
    ]
  },
  "nearby_hospitals": [
    {
      "name": "Bệnh viện Da liễu Trung ương",
      "address": "15A Phương Mai, Đống Đa, Hà Nội",
      "distance": "3.2 km",
      "phone": "024 3852 2616"
    }
  ]
}
```

---

### 2.3. Lấy lịch sử hội thoại (Conversation History)
Lấy lại toàn bộ nội dung chat của một phiên hội thoại đã có.

* **Endpoint:** `GET /api/v1/sessions/:session_id/history`
* **Response (Success - 200 OK):**
```json
{
  "success": true,
  "session_id": "a9b8c7d6-e5f4-3210-abcd-ef0123456789",
  "history": [
    {
      "id": "e3b0c442...",
      "role": "user",
      "content": "Tôi bị mụn bọc sưng đỏ ở mặt rất đau.",
      "image_url": "https://supabase.co/.../acne.jpg",
      "created_at": "2026-05-17T09:15:00Z"
    },
    {
      "id": "f8a9b1c2...",
      "role": "assistant",
      "content": "Dựa trên mô tả và phân tích hình ảnh, hệ thống nhận diện tổn thương dạng mụn trứng cá viêm nặng (Acne). Bạn nên...",
      "triage_result": {
        "level": "MÀU XANH LÁ (Tự chăm sóc / Khám thường)",
        "condition": "Mụn trứng cá sưng viêm"
      },
      "created_at": "2026-05-17T09:15:03Z"
    }
  ]
}
```

---

## 3. Hội thoại Thời gian thực qua WebSockets (Real-time Agent Chat)

Độ trễ thấp và trải nghiệm tương tác mượt mà nhất đạt được bằng cách duy trì kết nối WebSocket trực tiếp đến Agent.

### 3.1. Kết nối (Handshake)
Frontend thiết lập kết nối đến đường dẫn sau:
```
ws://localhost:3000/api/v1/chat?session_id=<SESSION_ID>&user_id=<USER_ID>
```
* **Tham số Query:**
  - `session_id`: ID phiên hội thoại được tạo ở mục 2.1.
  - `user_id`: ID của người dùng để phân quyền bảo mật.

---

### 3.2. Cấu trúc Gửi tin nhắn từ Frontend (Client -> Server)
Khi người dùng nhập tin nhắn hoặc gửi kèm hình ảnh, Frontend gửi một gói tin JSON qua WebSocket dưới định dạng sau:

```json
{
  "event": "message",
  "data": {
    "text": "Tôi có gửi kèm ảnh chụp nốt mụn đỏ ở lợi của tôi, nó rất đau khi ăn uống.",
    "image_url": "https://supabase.co/storage/v1/object/public/symptoms/mouth_ulcer.jpg",
    "location": {
      "lat": 21.028511,
      "lng": 105.804817
    }
  }
}
```
* **Lưu ý về ảnh đính kèm:** 
  - Frontend nên upload ảnh lên bộ nhớ lưu trữ (ví dụ: Supabase Storage Bucket `symptoms`) trước để lấy một link CDN URL công khai (`image_url`), sau đó mới gửi link này trong tin nhắn WebSocket. điều này đảm bảo đường truyền socket luôn nhẹ nhàng và ổn định.

---

### 3.3. Cấu trúc Trả tin nhắn từ Backend (Server -> Client)

Backend Core (Agent) phản hồi qua WebSocket theo mô hình truyền tải luồng thông tin (Streaming) hoặc gói tin trọn vẹn:

#### A. Tin nhắn phản hồi thông thường (Agent Text response)
```json
{
  "event": "agent_response",
  "data": {
    "text": "Xin chào! Dựa trên hình ảnh bạn gửi, hệ thống nhận diện đây có khả năng cao là một nốt nhiệt miệng (Mouth Ulcer/Loét miệng) lành tính..."
  }
}
```

#### B. Khi Agent chạy xong công cụ chẩn đoán hình ảnh AI (CV Tool Finished)
```json
{
  "event": "cv_analysis",
  "data": {
    "target_area": "teeth",
    "predictions": [
      { "class": "Mouth Ulcer", "confidence": 0.91 },
      { "class": "Calculus", "confidence": 0.05 }
    ]
  }
}
```

#### C. Khi chẩn đoán có kết quả Triage cuối cùng (Final Triage Level Trigger)
Frontend dùng gói tin này để hiển thị màu sắc cảnh báo y tế (Đỏ, Vàng, Xanh lá) tương ứng lên UI:
```json
{
  "event": "triage_result",
  "data": {
    "level": "GREEN", 
    "level_display": "MÀU XANH LÁ (Tự chăm sóc / Khám thường)",
    "suspected_condition": "Nhiệt miệng (Mouth Ulcer)",
    "recommendations": [
      "Súc miệng bằng nước muối ấm loãng 2-3 lần/ngày.",
      "Tránh thức ăn cay nóng, đồ ăn nhiều dầu mỡ và đồ uống có ga.",
      "Bổ sung vitamin nhóm B, vitamin C và uống nhiều nước."
    ]
  }
}
```

#### D. Lỗi hệ thống (System Error)
```json
{
  "event": "error",
  "data": {
    "message": "Không thể kết nối với dịch vụ xử lý hình ảnh AI. Vui lòng thử lại sau."
  }
}
```

---

## 4. Đặc tả Trạng thái lỗi (HTTP Status Codes)

Hệ thống tuân thủ nghiêm ngặt chuẩn REST HTTP để báo cáo lỗi:

| HTTP Status | Mô tả lỗi | Ý nghĩa thực tế |
| :--- | :--- | :--- |
| **400 Bad Request** | Yêu cầu không hợp lệ | Thiếu tham số bắt buộc, sai kiểu dữ liệu hoặc ảnh gửi lên bị lỗi định dạng. |
| **401 Unauthorized** | Sai thông tin xác thực | Sai API Key hoặc token xác thực phiên chat giữa các dịch vụ bị hỏng. |
| **404 Not Found** | Không tìm thấy | ID phiên hội thoại (`session_id`) không tồn tại trên hệ thống dữ liệu. |
| **422 Unprocessable**| Sai nghiệp vụ xác thực | Gửi thiếu file ảnh khi gọi endpoint phân tích hình ảnh AI. |
| **500 Server Error** | Lỗi máy chủ | Lỗi phân tích cú pháp LLM hoặc lỗi rò rỉ bộ nhớ từ GPU Worker. |
