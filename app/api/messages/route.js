import { listMessages } from "../../../lib/tempmail";

export async function POST(request) {
  try {
    const body = await request.json();
    const pin = String(body.pin || "").trim();
    const email = String(body.email || body.emailToken || "").trim();

    if (!pin) {
      return Response.json({ error: "PIN 不能为空" }, { status: 400 });
    }

    if (!email) {
      return Response.json({ error: "临时邮箱不能为空" }, { status: 400 });
    }

    const messages = await listMessages({ pin, email });
    return Response.json({ messages });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "获取邮件列表失败",
      },
      { status: 500 },
    );
  }
}
