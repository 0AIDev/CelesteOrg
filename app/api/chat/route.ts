import { groq } from "@ai-sdk/groq";
import { frontendTools } from "@assistant-ui/ai-sdk";
import { convertToModelMessages, streamText } from "ai";

export const maxDuration = 30;

const systemPrompt = `You are Celeste AI, the intelligent assistant for Celeste HQ — an internal company workspace platform.

You have access to the team's workspace data including:
- Team members and org chart
- Calendar events and meetings
- Documents and approvals
- Reports and standups
- GitHub activity
- Ideas and feedback

Be helpful, concise, and professional. When asked about workspace data, provide clear and actionable insights. You can help with:
- Creating calendar events
- Summarizing team activity
- Finding information about teammates
- Drafting messages and documents
- Analyzing approvals and reports
- General workspace questions

Always respond in English. Be direct and efficient.`;

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: system ?? systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: frontendTools(tools),
  });

  return result.toUIMessageStreamResponse();
}
