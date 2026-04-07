import './axios-augment';
export { createHttpBundle, type CreateHttpBundleOptions, type HttpBundle } from './http';
export { getApiErrorMessage, readFetchErrorMessage } from './errors';
export {
  createAuthApi,
  type ChangePasswordBody,
  type ChangePasswordResponse,
  type LoginBody,
  type LoginResponse,
  type RegisterResponse,
} from './apis/auth.api';
export { createSystemApi } from './apis/system.api';
export {
  createAiApi,
  type AiChatRequestBody,
  type QuickQuestionItem,
  type QuickQuestionsResponse,
} from './apis/ai.api';
export { postAiChatStream, type StreamHandlers } from './apis/ai-stream.api';
export {
  createUsersApi,
  type CurrentUserSummary,
  type UserListItem,
  type UsersListParams,
  type UsersListResponse,
} from './apis/users.api';
export {
  createMessagesApi,
  type MarkReadResponse,
  type MessageItem,
  type MessageListParams,
  type MessageListResponse,
  type MessagePriority,
  type ReadAllResponse,
  type UnreadCountResponse,
} from './apis/messages.api';
export {
  createDocsApi,
  type DocDetail,
  type DocListItem,
  type DocListParams,
  type DocListResponse,
} from './apis/docs.api';
export { readMessagesStream, type MessageStreamHandlers } from './apis/messages-stream.api';
