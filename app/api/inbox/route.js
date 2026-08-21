import { createInbox } from "../../../lib/tempmail";

export async function POST(request) {
  try {
    const body = await request.json();
    const pin = String(body.pin || "").trim();
    const tempmailEmail = String(body.tempmailEmail || "").trim();

    if (!pin) {
      return Response.json({ error: "PIN 不能为空" }, { status: 400 });
    }

    if (!tempmailEmail) {
      return Response.json({ error: "tempmail 邮箱不能为空" }, { status: 400 });
    }

    const inbox = await createInbox({ pin, tempmailEmail });
    return Response.json({
      email: inbox.email || tempmailEmail.toLowerCase(),
      emailToken: inbox.email,
      inbox,
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "创建收件箱失败",
      },
      { status: 500 },
    );
  }
}
