import { getMessage } from "../../../lib/tempmail";

export async function POST(request) {
  try {
    const body = await request.json();
    const pin = String(body.pin || "").trim();
    const email = String(body.email || "").trim();
    const messageId = String(body.messageId || "").trim();

    if (!pin) {
      return Response.json({ error: "PIN 不能为空" }, { status: 400 });
    }

    if (!email) {
      return Response.json({ error: "临时邮箱不能为空" }, { status: 400 });
    }

    if (!messageId) {
      return Response.json({ error: "邮件 ID 不能为空" }, { status: 400 });
    }

    const message = await getMessage({ pin, email, messageId });
    return Response.json({ message });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "获取邮件内容失败",
      },
      { status: 500 },
    );
  }
}
