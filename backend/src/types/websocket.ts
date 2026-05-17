/**
 * WebSocket Message Types for ReAct Flow
 * Spec: BACKEND_WEBSOCKET_SPEC.md
 */

// Base message interface
export interface BaseMessage {
  type: string;
  timestamp: string; // ISO 8601 format
  session_id?: string;
}

// Thought message - AI reasoning
export interface ThoughtMessage extends BaseMessage {
  type: 'thought';
  content: string;
  variant?: 'initial' | 'intermediate' | 'final';
}

// Action start - Tool execution begins
export interface ActionStartMessage extends BaseMessage {
  type: 'action_start';
  tool_name: string;
  tool_display_name: string;
}

// Tool-specific result types
export interface CVPrediction {
  condition: string;
  confidence: number; // 0.0 to 1.0
}

export interface CVResults {
  predictions: CVPrediction[];
  visual_features?: string[];
  annotations?: Array<{
    bbox: [number, number, number, number];
    label: string;
    confidence: number;
  }>;
  model_info?: {
    name: string;
    accuracy: number;
    trained_on?: number;
  };
}

export interface RedFlag {
  symptom: string;
  risk: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TriageResults {
  level: 'routine' | 'urgent' | 'emergency';
  reasoning: string;
  confidence: number;
  red_flags: RedFlag[];
  next_steps: string[];
}

export interface GuidelineResults {
  query: string;
  guidelines: Array<{
    title: string;
    content: string;
    source: string;
    relevance_score: number;
    url?: string;
  }>;
}

// Union type for all possible tool results
export type ToolResults = CVResults | TriageResults | GuidelineResults | Record<string, any>;

// Action complete - Tool execution finished
export interface ActionCompleteMessage extends BaseMessage {
  type: 'action_complete';
  tool_name: string;
  duration_ms: number;
  results: ToolResults;
}

// Action error - Tool execution failed
export interface ActionErrorMessage extends BaseMessage {
  type: 'action_error';
  tool_name: string;
  error_code: string;
  error_message: string;
  duration_ms: number;
}

// Observation - AI interprets tool results
export interface ObservationMessage extends BaseMessage {
  type: 'observation';
  tool_name: string;
  findings: any;
  confidence: number;
}

// Final answer - Agent completes
export interface FinalAnswerMessage extends BaseMessage {
  type: 'final_answer';
  result: {
    triage_level: string;
    recommendation: {
      action: string;
      timeframe: string;
      home_care_advice: string;
      warning_signs: string;
    };
    red_flags: RedFlag[];
  };
}

// Error message
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  code: string;
  message: string;
}

// Union type for all message types
export type WebSocketMessage =
  | ThoughtMessage
  | ActionStartMessage
  | ActionCompleteMessage
  | ActionErrorMessage
  | ObservationMessage
  | FinalAnswerMessage
  | ErrorMessage;

// Tool display names mapping
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  derm_cv: 'Dermatology CV Analysis',
  eye_cv: 'Eye Condition Analysis',
  wound_cv: 'Wound Assessment',
  triage_rules: 'Triage Classification',
  guideline_retrieval: 'Medical Guidelines',
  rag_query: 'Medical Knowledge Retrieval',
};
