const fs = require('fs');
const paths = ['facebook', 'tiktok', 'instagram', 'youtube', 'google'].map(p => `src/app/dashboard/${p}/page.tsx`);

const newBlock = `{/* Voucher Input */}
              <div className="bg-white/5 border border-outline-variant/30 rounded-xl p-4 flex flex-col gap-3">
                <label className="block text-sm font-medium text-on-surface-variant">Mã giảm giá (Nếu có)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={voucherCode}
                    onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(''); setAppliedVoucher(null); }}
                    className="flex-1 bg-surface-variant/30 border border-outline-variant/30 text-on-surface rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50 uppercase placeholder:text-on-surface-variant/50 placeholder:normal-case"
                    placeholder="Nhập mã giảm giá..."
                  />
                  <button type="button" onClick={handleApplyVoucher} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium px-4 py-2 rounded-lg transition-all">
                    Áp dụng
                  </button>
                </div>
                {voucherError && <p className="text-red-400 text-xs">{voucherError}</p>}
                {appliedVoucher && <p className="text-green-400 text-xs font-medium">Đã áp dụng mã {appliedVoucher.code}: Giảm {fmt(appliedVoucher.discountAmount)}đ</p>}
              </div>
              </>
              )}`;

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');

  // Replace everything from {/* Voucher Input */} down to </>\n              )} inclusive
  const regex = /\{\/\* Voucher Input \*\/\}[\s\S]*?<\/div>\s*<\/>\s*\)\}/;
  content = content.replace(regex, newBlock);

  fs.writeFileSync(p, content, 'utf8');
});

console.log('Fixed garbled UI completely.');
