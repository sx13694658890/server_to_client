import type { AxiosInstance, AxiosRequestConfig } from 'axios';

export type QuickQuestionItem = { id: string; label: string };

export type QuickQuestionsResponse = {
  items: QuickQuestionItem[];
};

/** 与 OpenAPI 对齐的宽松 body，具体校验在调用方 zod */
export type AiChatRequestBody = Record<string, unknown>;

export function createAiApi(client: AxiosInstance) {
  return {
    getQuickQuestions(config?: AxiosRequestConfig) {
      return client.get<QuickQuestionsResponse>('/ai/quick-questions', config);
    },
    chat(body: AiChatRequestBody, config?: AxiosRequestConfig) {
      return client.post<unknown>('/ai/chat', body, config);
    },
  };
}
