-- 给 AI 会话消息增加可持久化的智能体执行轨迹。
ALTER TABLE "AiMessage" ADD COLUMN "executionTrace" JSONB;
