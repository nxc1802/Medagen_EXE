import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

export const swaggerOptions = {
  openapi: '3.1.0',
  info: {
    title: 'MEDAGEN Backend API',
    description: 'AI Triage Assistant API với ReAct Agent và Gemini 2.5Flash',
    version: '2.0.0',
    contact: {
      name: 'MEDAGEN Team'
    }
  },
  servers: [
      {
        url: 'http://localhost:7860',
        description: 'Development server (Port 7860)'
      }
  ],
  tags: [
      {
        name: 'health',
        description: 'Health check endpoints'
      },
      {
        name: 'triage',
        description: 'AI Triage endpoints'
      },
      {
        name: 'cv',
        description: 'Computer Vision endpoints - Phân tích hình ảnh y tế'
      },
      {
        name: 'rag',
        description: 'RAG endpoints - Tìm kiếm hướng dẫn y tế'
      },
      {
        name: 'maps',
        description: 'Google Maps endpoints - Tìm cơ sở y tế'
      },
      {
        name: 'sessions',
        description: 'Session management endpoints'
      },
      {
        name: 'conversations',
        description: 'Conversation history endpoints'
      }
  ],
  components: {
      schemas: {
        HealthCheckRequest: {
          type: 'object',
          required: ['user_id'],
          properties: {
            text: {
              type: 'string',
              description: 'Mô tả triệu chứng của người dùng (bắt buộc nếu không có image_url)',
              example: 'Mắt trái đỏ và hơi mờ 2 ngày nay'
            },
            image_url: {
              type: 'string',
              format: 'uri',
              description: 'URL của hình ảnh (bắt buộc nếu không có text)',
              example: 'https://supabase.../image.jpg'
            },
            user_id: {
              type: 'string',
              description: 'ID của người dùng',
              example: 'abc123'
            },
            session_id: {
              type: 'string',
              format: 'uuid',
              description: 'Session ID để theo dõi lịch sử hội thoại (tùy chọn, sẽ tự động tạo mới nếu không có)',
              example: '550e8400-e29b-41d4-a716-446655440000'
            },
            location: {
              type: 'object',
              description: 'Vị trí của người dùng (tùy chọn)',
              properties: {
                lat: {
                  type: 'number',
                  description: 'Vĩ độ',
                  example: 10.78
                },
                lng: {
                  type: 'number',
                  description: 'Kinh độ',
                  example: 106.7
                }
              }
            }
          },
          oneOf: [
            { required: ['text'] },
            { required: ['image_url'] }
          ]
        },
        HealthCheckResponse: {
          type: 'object',
          properties: {
            triage_level: {
              type: 'string',
              enum: ['emergency', 'urgent', 'routine', 'self-care'],
              description: 'Mức độ triage'
            },
            symptom_summary: {
              type: 'string',
              description: 'Tóm tắt triệu chứng'
            },
            red_flags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Các dấu hiệu nguy hiểm'
            },
            suspected_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Tên tình trạng nghi ngờ'
                  },
                  source: {
                    type: 'string',
                    enum: ['cv_model', 'guideline', 'user_report', 'reasoning'],
                    description: 'Nguồn của tình trạng'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Độ tin cậy'
                  }
                }
              }
            },
            cv_findings: {
              type: 'object',
              properties: {
                model_used: {
                  type: 'string',
                  enum: ['derm_cv', 'eye_cv', 'wound_cv', 'none'],
                  description: 'Model CV được sử dụng'
                },
                raw_output: {
                  type: 'object',
                  description: 'Kết quả raw từ CV model'
                }
              }
            },
            recommendation: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: 'Hành động khuyến nghị'
                },
                timeframe: {
                  type: 'string',
                  description: 'Thời gian khuyến nghị'
                },
                home_care_advice: {
                  type: 'string',
                  description: 'Lời khuyên chăm sóc tại nhà'
                },
                warning_signs: {
                  type: 'string',
                  description: 'Dấu hiệu cảnh báo'
                }
              }
            },
            nearest_clinic: {
              type: 'object',
              description: 'Cơ sở y tế gần nhất (nếu có location)',
              properties: {
                name: {
                  type: 'string',
                  description: 'Tên cơ sở y tế'
                },
                distance_km: {
                  type: 'number',
                  description: 'Khoảng cách (km)'
                },
                address: {
                  type: 'string',
                  description: 'Địa chỉ'
                },
                rating: {
                  type: 'number',
                  description: 'Đánh giá'
                }
              }
            },
            session_id: {
              type: 'string',
              format: 'uuid',
              description: 'Session ID để tiếp tục cuộc hội thoại trong các request tiếp theo'
            },
            message: {
              type: 'string',
              description: 'Markdown response từ LLM (natural language, không bị giới hạn bởi JSON structure)'
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian kiểm tra'
            },
            llm: {
              type: 'string',
              description: 'Model LLM đang sử dụng',
              example: 'gemini-2.5-flash'
            },
            cv_services: {
              type: 'object',
              properties: {
                derm_cv: {
                  type: 'string',
                  example: 'unknown'
                },
                eye_cv: {
                  type: 'string',
                  example: 'unknown'
                },
                wound_cv: {
                  type: 'string',
                  example: 'unknown'
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Loại lỗi'
            },
            message: {
              type: 'string',
              description: 'Thông báo lỗi'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Chi tiết lỗi (nếu có)'
            }
          }
        },
        ConversationSession: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của session'
            },
            user_id: {
              type: 'string',
              description: 'ID của người dùng'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian tạo'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian cập nhật cuối'
            }
          }
        },
        ConversationMessage: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của message'
            },
            session_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID của session'
            },
            user_id: {
              type: 'string',
              description: 'ID của người dùng'
            },
            role: {
              type: 'string',
              enum: ['user', 'assistant'],
              description: 'Vai trò của message'
            },
            content: {
              type: 'string',
              description: 'Nội dung message'
            },
            image_url: {
              type: 'string',
              format: 'uri',
              description: 'URL của hình ảnh (nếu có)'
            },
            triage_result: {
              type: 'object',
              description: 'Kết quả triage (chỉ có với assistant messages)'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian tạo'
            }
          }
        }
      }
    }
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayRequestDuration: true,
    persistAuthorization: true
  },
  staticCSP: false, // Disable strict CSP to allow Swagger UI to fetch JSON
  transformSpecification: (swaggerObject, request) => {
    // Ensure servers URL matches current request
    if (swaggerObject.servers && swaggerObject.servers.length > 0) {
      const protocol = request.headers['x-forwarded-proto'] || (request.protocol || 'http');
      const host = request.headers.host || 'localhost:7860';
      swaggerObject.servers[0].url = `${protocol}://${host}`;
    }
    return swaggerObject;
  },
  transformSpecificationClone: true
};

