import { get, post } from './api';
import { getItem } from '@/utils/authStorage';
import ServerConfig from './serverConfig';

type WsPayload = Record<string, unknown>;

class ChatService {
  private socket: WebSocket | null = null;

  private messageCallback: ((data: WsPayload) => void) | null = null;

  private activeConversationId: string | null = null;

  private reconnectInterval = 3000;

  async getOrCreateConversation(params: {
    ofertaId: string;
    solicitudId?: string | null;
    type?: 'service' | 'marketplace';
  }): Promise<string> {
    const response = await post('/chat/conversations/get_or_create/', {
      oferta_id: params.ofertaId,
      solicitud_id: params.solicitudId ?? undefined,
      type: params.type ?? 'service',
    });
    const data = response.data as { id?: string | number };
    if (!data?.id) {
      throw new Error('No se recibió id de conversación');
    }
    return String(data.id);
  }

  async getMessages(conversationId: string) {
    const response = await get(`/chat/conversations/${conversationId}/messages/`);
    const data = response.data as { results?: unknown[] } | unknown[];
    const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
    return rows;
  }

  async markRead(conversationId: string) {
    await post(`/chat/conversations/${conversationId}/mark_read/`);
  }

  async sendMessageHTTP(
    conversationId: string,
    content: { content?: string; attachment?: { uri: string; name: string; type: string } | null },
    isMultipart = false,
  ) {
    if (isMultipart && content.attachment) {
      const token = await getItem('authToken');
      const baseURL = await ServerConfig.getInstance().getBaseURL();
      const formData = new FormData();
      if (content.content) formData.append('content', content.content);
      formData.append('attachment', {
        uri: content.attachment.uri,
        name: content.attachment.name,
        type: content.attachment.type,
      } as unknown as Blob);

      const response = await fetch(
        `${baseURL}/chat/conversations/${conversationId}/send_message/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}`);
      }
      return response.json();
    }

    const response = await post(`/chat/conversations/${conversationId}/send_message/`, {
      content: content.content ?? '',
    });
    return response.data;
  }

  async connect(conversationId: string, onMessage: (data: WsPayload) => void) {
    if (this.socket && this.activeConversationId === conversationId) {
      this.messageCallback = onMessage;
      return;
    }

    this.disconnect();

    this.activeConversationId = conversationId;
    this.messageCallback = onMessage;

    const token = await getItem('authToken');
    if (!token) {
      console.error('[chatService] Sin token para WebSocket');
      return;
    }

    const baseURL = await ServerConfig.getInstance().getBaseURL();
    const wsBase = baseURL.replace(/^http/, 'ws').replace(/\/api$/, '');
    const wsUrl = `${wsBase}/ws/chat/${conversationId}/?token=${token}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      if (__DEV__) console.log('[chatService] WS conectado', conversationId);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as WsPayload;
        this.messageCallback?.(data);
      } catch (e) {
        console.error('[chatService] Error parseando WS:', e);
      }
    };

    this.socket.onerror = () => {
      console.warn('[chatService] Error WebSocket');
    };

    this.socket.onclose = () => {
      if (this.activeConversationId === conversationId) {
        setTimeout(() => {
          if (this.activeConversationId === conversationId && this.messageCallback) {
            this.connect(conversationId, onMessage);
          }
        }, this.reconnectInterval);
      }
    };
  }

  disconnect() {
    this.activeConversationId = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageCallback = null;
  }
}

const chatService = new ChatService();
export default chatService;
