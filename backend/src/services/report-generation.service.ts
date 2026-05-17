import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { ConversationHistoryService } from './conversation-history.service.js';
import { ToolExecutionTrackerService } from './tool-execution-tracker.service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Medical Report - Chỉ chứa dữ liệu có ý nghĩa về mặt y tế
 * Loại bỏ tất cả thông tin kỹ thuật (tool_name, execution_order, execution_time_ms, status, etc.)
 */
export interface MedicalReport {
  session_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Thông tin triệu chứng và mối quan tâm
  concerns: Array<{
    description: string;
    timestamp: string;
    has_image: boolean;
  }>;
  
  // Kết quả phân tích hình ảnh (nếu có)
  image_analysis?: {
    top_conditions: Array<{
      condition_name: string;
      confidence_percent: string;
      probability: number;
    }>;
    model_type: string;
  };
  
  // Phân loại mức độ khẩn cấp
  triage_assessment: Array<{
    level: 'emergency' | 'urgent' | 'routine' | 'self-care';
    timestamp: string;
    red_flags: string[];
    reasoning: string;
  }>;
  
  // Bệnh nghi ngờ
  suspected_conditions: Array<{
    condition_name: string;
    source: 'cv_model' | 'guideline' | 'user_report' | 'reasoning';
    confidence: 'high' | 'medium' | 'low';
    occurrences: number;
  }>;
  
  // Hướng dẫn y tế đã truy xuất
  medical_guidelines: Array<{
    content: string;
    relevance_score?: number;
    source?: string;
  }>;
  
  // Khuyến nghị điều trị
  recommendations: Array<{
    action: string;
    timeframe: string;
    home_care_advice?: string;
    warning_signs?: string;
    timestamp: string;
  }>;
  
  // Bệnh viện được đề xuất
  suggested_hospitals: Array<{
    name: string;
    distance_km: number;
    address: string;
    rating?: number;
    specialty_match?: 'high' | 'medium' | 'low';
    condition?: string;
  }>;
}

/**
 * ComprehensiveReport - Giữ lại để backward compatibility
 * Nhưng report_content sẽ là MedicalReport (chỉ JSON, không có markdown)
 */
export interface ComprehensiveReport {
  session_id: string;
  user_id: string;
  report_type: 'full' | 'summary' | 'tools_only';
  report_content: MedicalReport;
  report_markdown?: string; // Optional, chỉ dùng cho display
}

export class ReportGenerationService {
  private supabaseClient: SupabaseClient;
  private conversationService: ConversationHistoryService;
  private toolTracker: ToolExecutionTrackerService;

  constructor(
    supabaseClient: SupabaseClient,
    conversationService: ConversationHistoryService,
    toolTracker: ToolExecutionTrackerService
  ) {
    this.supabaseClient = supabaseClient;
    this.conversationService = conversationService;
    this.toolTracker = toolTracker;
  }

  /**
   * Generate comprehensive report for a session
   */
  async generateReport(
    sessionId: string,
    userId: string,
    reportType: 'full' | 'summary' | 'tools_only' = 'full'
  ): Promise<ComprehensiveReport> {
    try {
      logger.info(`Generating ${reportType} report for session ${sessionId}`);

      // Get session info
      const { data: sessionData, error: sessionError } = await this.supabaseClient
        .from('conversation_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get conversation history
      const conversationHistory = await this.conversationService.getHistory(sessionId, 1000);
      
      // Get all tool executions for this session
      const toolExecutions = await this.toolTracker.getToolExecutionsForSession(sessionId);

      // Build report content (chỉ JSON, tập trung vào dữ liệu y tế)
      const reportContent = await this.buildReportContent(
        sessionData,
        conversationHistory,
        toolExecutions,
        reportType
      );

      const report: ComprehensiveReport = {
        session_id: sessionId,
        user_id: userId,
        report_type: reportType,
        report_content: reportContent
        // report_markdown không cần thiết nữa - chỉ dùng JSON
      };

      // Save report to database
      await this.saveReport(report);

      logger.info(`Report generated successfully for session ${sessionId}`);
      return report;
    } catch (error) {
      logger.error({ error }, 'Error generating report');
      throw error;
    }
  }

  /**
   * Build structured report content - Chỉ chứa dữ liệu y tế có ý nghĩa
   */
  private async buildReportContent(
    sessionData: any,
    conversationHistory: any[],
    toolExecutions: any[],
    _reportType: string
  ): Promise<MedicalReport> {
    // Extract medical data từ conversation history
    const concerns: MedicalReport['concerns'] = [];
    const triageAssessments: MedicalReport['triage_assessment'] = [];
    const recommendations: MedicalReport['recommendations'] = [];
    
    // Extract conditions và hospitals từ conversation
    const conditionsMap = new Map<string, { 
      source: 'cv_model' | 'guideline' | 'user_report' | 'reasoning';
      confidence: 'high' | 'medium' | 'low';
      count: number;
    }>();
    const hospitalsMap = new Map<string, MedicalReport['suggested_hospitals'][0]>();
    
    // Process conversation history để extract dữ liệu y tế
    conversationHistory.forEach(msg => {
      // Extract concerns từ user messages
      if (msg.role === 'user') {
        concerns.push({
          description: msg.content,
          timestamp: msg.created_at,
          has_image: !!msg.image_url
        });
      }
      
      // Extract triage assessment và recommendations từ triage_result
      if (msg.triage_result) {
        const triageResult = msg.triage_result;
        
        // Triage assessment
        triageAssessments.push({
          level: triageResult.triage_level,
          timestamp: msg.created_at,
          red_flags: triageResult.red_flags || [],
          reasoning: triageResult.symptom_summary || 'Đánh giá dựa trên triệu chứng và phân tích hình ảnh'
        });
        
        // Recommendations
        if (triageResult.recommendation) {
          recommendations.push({
            action: triageResult.recommendation.action || '',
            timeframe: triageResult.recommendation.timeframe || '',
            home_care_advice: triageResult.recommendation.home_care_advice,
            warning_signs: triageResult.recommendation.warning_signs,
            timestamp: msg.created_at
          });
        }
        
        // Extract suspected conditions
        if (triageResult.suspected_conditions) {
          triageResult.suspected_conditions.forEach((cond: any) => {
            const key = cond.name;
            const confidence = this.mapConfidenceToLevel(cond.confidence);
            const source = cond.source as 'cv_model' | 'guideline' | 'user_report' | 'reasoning';
            
            if (conditionsMap.has(key)) {
              conditionsMap.get(key)!.count++;
            } else {
              conditionsMap.set(key, {
                source,
                confidence,
                count: 1
              });
            }
          });
        }
        
        // Extract hospital info
        if (triageResult.nearest_clinic) {
          const clinic = triageResult.nearest_clinic;
          const hospitalKey = clinic.name;
          if (!hospitalsMap.has(hospitalKey)) {
            hospitalsMap.set(hospitalKey, {
              name: clinic.name,
              distance_km: clinic.distance_km,
              address: clinic.address,
              rating: clinic.rating,
              specialty_match: clinic.specialty_score 
                ? (clinic.specialty_score > 0.5 ? 'high' : clinic.specialty_score > 0 ? 'medium' : 'low')
                : undefined,
              condition: triageResult.suspected_conditions?.[0]?.name
            });
          }
        }
      }
    });
    
    // Extract medical data từ tool executions
    let imageAnalysis: MedicalReport['image_analysis'] | undefined;
    const medicalGuidelines: MedicalReport['medical_guidelines'] = [];
    
    toolExecutions.forEach(exec => {
      // Extract CV/Image Analysis results
      if (exec.tool_name === 'derm_cv' || exec.tool_name === 'eye_cv' || exec.tool_name === 'wound_cv') {
        if (exec.output_data?.top_conditions && exec.output_data.top_conditions.length > 0) {
          imageAnalysis = {
            top_conditions: exec.output_data.top_conditions.map((cond: any) => ({
              condition_name: cond.condition || cond.name || 'Unknown',
              confidence_percent: cond.confidence || `${(cond.probability * 100).toFixed(1)}%`,
              probability: cond.probability || parseFloat(cond.confidence?.replace('%', '')) / 100 || 0
            })),
            model_type: exec.tool_name
          };
        }
      }
      
      // Extract RAG/Guidelines
      if (exec.tool_name === 'rag_query' || exec.tool_name === 'guideline_retrieval') {
        if (exec.output_data?.guidelines && Array.isArray(exec.output_data.guidelines)) {
          exec.output_data.guidelines.forEach((guideline: any) => {
            const content = typeof guideline === 'string' 
              ? guideline 
              : (guideline.content || guideline.snippet || guideline.text || JSON.stringify(guideline));
            
            if (content && content.trim()) {
              medicalGuidelines.push({
                content: content.trim(),
                relevance_score: guideline.relevance_score || guideline.score,
                source: guideline.source || 'Bộ Y Tế'
              });
            }
          });
        }
      }
      
      // Extract hospital từ maps tool
      if (exec.tool_name === 'maps') {
        if (exec.output_data?.hospital) {
          const hospital = exec.output_data.hospital;
          const hospitalKey = hospital.name;
          if (!hospitalsMap.has(hospitalKey)) {
            hospitalsMap.set(hospitalKey, {
              name: hospital.name,
              distance_km: hospital.distance_km,
              address: hospital.address,
              rating: hospital.rating,
              specialty_match: hospital.specialty_match,
              condition: exec.input_data?.condition
            });
          }
        }
        
        // Cũng extract từ top_hospitals nếu có
        if (exec.output_data?.top_hospitals && Array.isArray(exec.output_data.top_hospitals)) {
          exec.output_data.top_hospitals.forEach((hospital: any) => {
            const hospitalKey = hospital.name;
            if (!hospitalsMap.has(hospitalKey)) {
              hospitalsMap.set(hospitalKey, {
                name: hospital.name,
                distance_km: hospital.distance_km,
                address: hospital.address
              });
            }
          });
        }
      }
    });
    
    // Build final medical report
    const medicalReport: MedicalReport = {
      session_id: sessionData.id,
      user_id: sessionData.user_id || '',
      created_at: sessionData.created_at,
      updated_at: sessionData.updated_at,
      concerns,
      triage_assessment: triageAssessments,
      suspected_conditions: Array.from(conditionsMap.entries())
        .map(([condition_name, data]) => ({
          condition_name,
          source: data.source,
          confidence: data.confidence,
          occurrences: data.count
        }))
        .sort((a, b) => b.occurrences - a.occurrences),
      medical_guidelines: medicalGuidelines,
      recommendations,
      suggested_hospitals: Array.from(hospitalsMap.values())
    };
    
    // Add image analysis nếu có
    if (imageAnalysis) {
      medicalReport.image_analysis = imageAnalysis;
    }
    
    return medicalReport;
  }
  
  /**
   * Map confidence string to level
   */
  private mapConfidenceToLevel(confidence: string): 'high' | 'medium' | 'low' {
    const confLower = confidence.toLowerCase();
    if (confLower.includes('high') || confLower.includes('cao') || parseFloat(confLower) >= 70) {
      return 'high';
    }
    if (confLower.includes('low') || confLower.includes('thấp') || parseFloat(confLower) < 40) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Save report to database
   */
  private async saveReport(report: ComprehensiveReport): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('comprehensive_reports')
        .insert({
          id: uuidv4(),
          session_id: report.session_id,
          user_id: report.user_id,
          report_type: report.report_type,
          report_content: report.report_content,
          report_markdown: report.report_markdown || null,
          generated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error({ error }, 'Failed to save report');
        throw error;
      }
    } catch (error) {
      logger.error({ error }, 'Error saving report');
      throw error;
    }
  }

  /**
   * Get existing report for a session
   */
  async getReport(sessionId: string): Promise<ComprehensiveReport | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('comprehensive_reports')
        .select('*')
        .eq('session_id', sessionId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        session_id: data.session_id,
        user_id: data.user_id,
        report_type: data.report_type,
        report_content: data.report_content,
        report_markdown: data.report_markdown || undefined
      };
    } catch (error) {
      logger.error({ error }, 'Error getting report');
      return null;
    }
  }
}

