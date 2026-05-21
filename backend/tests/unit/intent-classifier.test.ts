import { describe, it, expect } from 'vitest';
import { IntentClassifierService } from '../../src/services/intent-classifier.service';

describe('IntentClassifierService', () => {
  const classifier = new IntentClassifierService();

  it('should correctly classify short educational queries as disease_info', async () => {
    // Test case M2: "nhiệt miệng là gì", "loét miệng là gì" should be disease_info
    const intent1 = await classifier.classifyIntent('nhiệt miệng là gì', false);
    expect(intent1.type).toBe('disease_info');

    const intent2 = await classifier.classifyIntent('loét miệng là gì', false);
    expect(intent2.type).toBe('disease_info');

    const intent3 = await classifier.classifyIntent('bệnh sởi là gì và tại sao bị sởi', false);
    expect(intent3.type).toBe('disease_info');
  });

  it('should correctly classify emergency / medical complaints as triage', async () => {
    const intent1 = await classifier.classifyIntent('Tôi bị đau ngực dữ dội khó thở', false);
    expect(intent1.type).toBe('triage');

    const intent2 = await classifier.classifyIntent('bé bị sốt phát ban đỏ', false);
    expect(intent2.type).toBe('triage');
  });

  it('should correctly classify casual greetings as casual_greeting', async () => {
    const intent1 = await classifier.classifyIntent('xin chào trợ lý', false);
    expect(intent1.type).toBe('casual_greeting');

    const intent2 = await classifier.classifyIntent('hello admin', false);
    expect(intent2.type).toBe('casual_greeting');
  });

  it('should correctly classify out of scope queries as out_of_scope', async () => {
    const intent1 = await classifier.classifyIntent('chi phí mua bảo hiểm y tế là bao nhiêu', false);
    expect(intent1.type).toBe('out_of_scope');

    const intent2 = await classifier.classifyIntent('hướng dẫn đắp lá thuốc nam trị mụn', false);
    expect(intent2.type).toBe('out_of_scope');
  });
});
