import './globals.css';

export const metadata = {
  title: 'ระบบดาวน์โหลดเกียรติบัตร Teleconference',
  description: 'ศูนย์การศึกษาพิเศษ ประจำจังหวัดลำปาง',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function(msg, url, line, col, error) {
            var errDiv = document.createElement('div');
            errDiv.style.position = 'fixed';
            errDiv.style.top = '0';
            errDiv.style.left = '0';
            errDiv.style.width = '100%';
            errDiv.style.background = '#dc2626';
            errDiv.style.color = 'white';
            errDiv.style.padding = '20px';
            errDiv.style.zIndex = '999999';
            errDiv.style.wordBreak = 'break-all';
            errDiv.style.fontSize = '14px';
            errDiv.innerHTML = '<b>🚨 [System Crash]</b><br/>' + msg + '<br/><small>Line: ' + line + ', Col: ' + col + '</small>';
            document.body.appendChild(errDiv);
          };
          window.onunhandledrejection = function(e) {
            var errDiv = document.createElement('div');
            errDiv.style.position = 'fixed';
            errDiv.style.bottom = '0';
            errDiv.style.left = '0';
            errDiv.style.width = '100%';
            errDiv.style.background = '#d97706';
            errDiv.style.color = 'white';
            errDiv.style.padding = '20px';
            errDiv.style.zIndex = '999999';
            errDiv.style.wordBreak = 'break-all';
            errDiv.style.fontSize = '14px';
            errDiv.innerHTML = '<b>⚠️ [Network/Promise Error]</b><br/>' + (e.reason ? e.reason.message || e.reason : 'Unknown reason');
            document.body.appendChild(errDiv);
          };
        `}} />
      </head>
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
