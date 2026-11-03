import Link from 'next/link';
import {ArrowUpRight,Smartphone} from 'lucide-react';
export function StartQr(){
 return <section className="start-qr-card" aria-label="Mã QR đăng ký nhanh">
  <Link href="/register?source=qr" className="start-qr-image" aria-label="Mở trang đăng ký nhanh từ mã QR"><img src="/qr/signup.svg" width={156} height={156} alt="Mã QR mở trang đăng ký SmartNotes AI"/></Link>
  <div><span className="start-qr-eyebrow"><Smartphone size={14}/> BẮT ĐẦU TRÊN ĐIỆN THOẠI</span><h2>Quét mã, vào học thôi.</h2><p>Mở camera quét QR, rồi chọn <strong>Tiếp tục với Google</strong> trên trang đăng ký.</p><Link href="/register?source=qr">Đăng ký nhanh với Google <ArrowUpRight size={15}/></Link><small>Chọn tài khoản Google · Không cần tạo mật khẩu mới</small></div>
 </section>;
}
