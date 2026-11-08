import Link from 'next/link';
import {ArrowUpRight,ScanLine,ShieldCheck} from 'lucide-react';
export function StartQr(){
 return <section className="start-qr-card" aria-label="Đăng nhập Google bằng mã QR">
  <Link href="/register?source=qr" className="start-qr-image" aria-label="Mở đăng ký nhanh bằng Google"><img src="/qr/signup.svg" width={156} height={156} alt="Quét mã QR để mở trang đăng ký Google SmartNotes AI"/></Link>
  <div className="start-qr-content">
   <span className="start-qr-eyebrow"><ScanLine size={14}/> QUÉT MÃ · VÀO GOOGLE</span>
   <h2>Quét QR, đăng nhập Google.</h2>
   <p>Quét bằng camera điện thoại, xác nhận quyền riêng tư rồi chọn tài khoản Google. Không cần tạo mật khẩu mới.</p>
   <Link href="/register?source=qr">Tiếp tục bằng Google <ArrowUpRight size={16}/></Link>
   <small><ShieldCheck size={13}/> Đăng nhập an toàn qua Firebase Authentication</small>
  </div>
 </section>;
}
