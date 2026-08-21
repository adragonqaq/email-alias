import "./globals.css";

export const metadata = {
  title: "邮件别名控制台",
  description: "生成随机邮箱别名，连接临时邮箱并查看邮件内容。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
