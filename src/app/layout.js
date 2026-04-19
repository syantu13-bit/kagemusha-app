import "./globals.css";

export const metadata = {
  title: "影武者相談室",
  description: "AIと本人が答える、あなただけの相談サービス",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
