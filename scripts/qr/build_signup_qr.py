"""Build the public signup QR. Requires qrcode==8.2 (build-time only)."""
import pathlib
import qrcode
import qrcode.image.svg
url='https://note-appme.vercel.app/register?source=qr'
qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=8,border=4)
qr.add_data(url);qr.make(fit=True)
root=pathlib.Path(__file__).resolve().parents[2]
qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(root/'public/qr/signup.svg')
# For local scanner validation; this raster is not shipped to the browser.
qr.make_image(fill_color='black',back_color='white').save('/tmp/noteapp-signup-qr.png')
print('Signup QR:',url)
