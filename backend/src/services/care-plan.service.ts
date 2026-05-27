import { GeminiLLM } from '../agent/gemini-llm.js';
import { SupabaseService } from './supabase.service.js';
import { logger } from '../utils/logger.js';

export interface CarePlanData {
  summary: string;
  lifestyle: Array<{
    title: string;
    icon: string;
    tips: string[];
  }>;
  nutrition: {
    include: Array<{ name: string; desc: string; icon: string }>;
    avoid: Array<{ name: string; badge: string; badgeColor: 'red' | 'amber' }>;
  };
  exercise: {
    recommended: string[];
    avoid: string[];
  };
  otc_suggestions: Array<{ name: string; desc: string; icon: string }>;
  next_checkup_days: number;
}

export class CarePlanService {
  private llm: GeminiLLM;

  constructor(private supabaseService: SupabaseService) {
    this.llm = new GeminiLLM();
  }

  async generateAndSave(userId: string): Promise<CarePlanData & { id: string }> {
    // 1. Fetch user data
    const [sessions, medicalHistory] = await Promise.all([
      this.supabaseService.getUserSessions(userId),
      this.supabaseService.getUserMedicalHistory(userId),
    ]);

    if (sessions.length === 0) {
      throw new Error('Chưa có lịch sử chẩn đoán. Vui lòng thực hiện ít nhất 1 lần phân tích.');
    }

    // 2. Extract unique conditions from sessions
    const conditions: string[] = Array.from(
      new Set(
        sessions.flatMap((s: any) =>
          (s.triage_result?.suspected_conditions ?? []).map((c: any) => c.name)
        )
      )
    ).filter(Boolean) as string[];

    // 3. Build context for Gemini
    const sessionSummaries = sessions.slice(0, 8).map((s: any) => ({
      date: new Date(s.created_at).toLocaleDateString('vi-VN'),
      symptoms: s.input_text?.slice(0, 200),
      triage: s.triage_level,
      conditions: (s.triage_result?.suspected_conditions ?? []).map((c: any) => c.name),
      recommendation: s.triage_result?.recommendation?.action?.slice(0, 150),
    }));

    const historyText = medicalHistory.length > 0
      ? medicalHistory.map((h: any) => `- ${h.condition_name}${h.is_chronic ? ' (mãn tính)' : ''}${h.notes ? ': ' + h.notes : ''}`).join('\n')
      : 'Không có';

    const conditionsText = conditions.length > 0
      ? conditions.join(', ')
      : 'Chưa xác định cụ thể';

    // 4. Prompt Gemini
    const prompt = `Bạn là bác sĩ AI của MedaGen. Hãy tạo một care plan cá nhân hóa cho bệnh nhân dựa trên dữ liệu sau.

=== LỊCH SỬ CHẨN ĐOÁN (${sessions.length} lần) ===
${JSON.stringify(sessionSummaries, null, 2)}

=== CÁC TÌNH TRẠNG PHÁT HIỆN ===
${conditionsText}

=== TIỀN SỬ BỆNH TỰ KHAI ===
${historyText}

=== YÊU CẦU ===
Tạo care plan theo đúng format JSON sau (trả về ONLY JSON, không markdown, không giải thích):

{
  "summary": "Tóm tắt ngắn gọn 2-3 câu về tình trạng sức khỏe và mục tiêu care plan. Viết bằng tiếng Việt, tự nhiên.",

  "lifestyle": [
    {
      "title": "Tên thói quen (VD: Giấc ngủ)",
      "icon": "tên material icon (VD: bedtime, sunny, water_drop)",
      "tips": ["lời khuyên 1", "lời khuyên 2"]
    }
  ],

  "nutrition": {
    "include": [
      { "name": "Tên thực phẩm", "desc": "Lý do và lợi ích ngắn gọn", "icon": "material icon" }
    ],
    "avoid": [
      { "name": "Tên thứ cần tránh", "badge": "Nhãn cảnh báo (VD: Gây viêm)", "badgeColor": "red hoặc amber" }
    ]
  },

  "exercise": {
    "recommended": ["Hoạt động phù hợp 1", "Hoạt động phù hợp 2"],
    "avoid": ["Hoạt động cần tránh 1"]
  },

  "otc_suggestions": [
    { "name": "Tên sản phẩm OTC", "desc": "Công dụng ngắn gọn", "icon": "material icon" }
  ],

  "next_checkup_days": 14
}

QUY TẮC:
- Viết hoàn toàn bằng tiếng Việt
- Cá nhân hóa theo đúng bệnh/tình trạng đã phát hiện
- lifestyle: 2-3 mục
- nutrition.include: 3-4 món, nutrition.avoid: 3-4 món
- exercise.recommended: 3-4 hoạt động, exercise.avoid: 1-2 hoạt động
- otc_suggestions: 2-3 sản phẩm OTC phù hợp (nếu không cần thiết thì để mảng rỗng)
- next_checkup_days: số ngày nên tái khám (7/14/30 tùy mức độ)
- KHÔNG kê đơn thuốc kê đơn, chỉ OTC
- Chỉ trả về JSON thuần, không có gì khác`;

    logger.info(`[CarePlan] Generating care plan for user ${userId} with ${conditions.length} conditions`);

    const raw = await this.llm._call(prompt);

    // 5. Parse JSON (strip markdown fences if Gemini adds them)
    let planData: CarePlanData;
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      planData = JSON.parse(cleaned);
    } catch {
      logger.error('[CarePlan] Failed to parse Gemini JSON response');
      throw new Error('AI trả về định dạng không hợp lệ. Vui lòng thử lại.');
    }

    // 6. Calculate next checkup date
    const nextCheckupDate = new Date();
    nextCheckupDate.setDate(nextCheckupDate.getDate() + (planData.next_checkup_days ?? 14));

    // 7. Save to DB
    const saved = await this.supabaseService.saveCarePlan({
      user_id: userId,
      source_session_ids: sessions.slice(0, 8).map((s: any) => s.id),
      conditions,
      lifestyle: planData.lifestyle,
      nutrition: planData.nutrition,
      exercise: planData.exercise,
      otc_suggestions: planData.otc_suggestions,
      summary: planData.summary,
      next_checkup_date: nextCheckupDate.toISOString().split('T')[0],
    });

    logger.info(`[CarePlan] Saved care plan ${saved.id} for user ${userId}`);

    return { ...planData, id: saved.id };
  }
}
