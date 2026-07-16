import './globals.css';

export const metadata = {
  title: 'ระบบดาวน์โหลดเกียรติบัตร Teleconference',
  description: 'ศูนย์การศึกษาพิเศษ ประจำจังหวัดลำปาง',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <main className="container">
          {children}
        </main>
        <footer className="footer">
          &copy; {new Date().getFullYear()} ศูนย์การศึกษาพิเศษ ประจำจังหวัดลำปาง
        </footer>
      </body>
    </html>
  );
}
