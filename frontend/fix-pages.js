const fs = require('fs');
const paths = ['facebook', 'tiktok', 'instagram', 'youtube', 'google'].map(p => `src/app/dashboard/${p}/page.tsx`);

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');

  // 1. Add voucher states
  content = content.replace(
    /const \[successMessage, setSuccessMessage\] = useState\(''\)/,
    `const [successMessage, setSuccessMessage] = useState('')\n  const [voucherCode, setVoucherCode] = useState('')\n  const [appliedVoucher, setAppliedVoucher] = useState<any>(null)\n  const [voucherError, setVoucherError] = useState('')`
  );

  // 2. Add handleApplyVoucher function
  const applyVoucherFunc = `
  const handleApplyVoucher = async () => {
    setVoucherError('');
    if (!voucherCode) return;
    try {
      const res = await fetch('http://localhost:4000/api/vouchers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('tq_token')}\` },
        body: JSON.stringify({ code: voucherCode, orderTotal: total, applicableType: 'ALL' })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedVoucher({ ...data.voucher, discountAmount: data.discountAmount });
      } else {
        setVoucherError(data.error);
        setAppliedVoucher(null);
      }
    } catch (err) {
      setVoucherError('L?i k?t n?i.');
    }
  };

  useEffect(() => {
    if (appliedVoucher) {
      handleApplyVoucher();
    }
  }, [total]);
  `;
  content = content.replace(/const handleCreateOrder = async \(\) => \{/, applyVoucherFunc + '\n  const handleCreateOrder = async () => {');

  // 3. Update total calculation for create order
  content = content.replace(/total: total,\n\s*note: note/, `total: appliedVoucher ? total - appliedVoucher.discountAmount : total,\n            note: note,\n            voucherCode: appliedVoucher?.code,\n            discount: appliedVoucher?.discountAmount`);
  
  content = content.replace(/total: lineTotal,\n\s*note: note/, `total: appliedVoucher ? lineTotal - (appliedVoucher.discountAmount / lines.length) : lineTotal,\n                  note: note,\n                  voucherCode: appliedVoucher?.code,\n                  discount: appliedVoucher ? (appliedVoucher.discountAmount / lines.length) : 0`);

  // 4. Update UI for Server List (originalPrice)
  content = content.replace(
    /Giá: <span className="text-cyan-400 font-bold">\{fmt\(srv\.price \* \(1 - discount\/100\)\)\}d<\/span> \/ tuong tác/,
    `Giá: {srv.originalPrice && <span className="line-through text-on-surface-variant/50 mr-2">{fmt(srv.originalPrice * (1 - discount/100))}d</span>}<span className="text-cyan-400 font-bold">{fmt(srv.price * (1 - discount/100))}d</span> / tuong tác`
  );

  // 5. Update UI for Total Calculation block
  content = content.replace(
    /<span className="text-on-surface font-medium">\{fmt\(currentServer\?\.price \* \(1 - discount\/100\) \|\| 0\)\}d<\/span>/,
    `<span className="text-on-surface font-medium">{currentServer?.originalPrice && <span className="line-through text-on-surface-variant/50 mr-2 text-xs">{fmt(currentServer.originalPrice * (1 - discount/100))}d</span>}{fmt(currentServer?.price * (1 - discount/100) || 0)}d</span>`
  );

  // 6. Add Voucher Input in UI before Total Calculation
  const voucherUI = `
              {/* Voucher Input */}
              <div className="bg-white/5 border border-outline-variant/30 rounded-xl p-4 flex flex-col gap-3">
                <label className="block text-sm font-medium text-on-surface-variant">Mã gi?m giá (N?u có)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={voucherCode}
                    onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(''); setAppliedVoucher(null); }}
                    className="flex-1 bg-surface-variant/30 border border-outline-variant/30 text-on-surface rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50 uppercase placeholder:text-on-surface-variant/50 placeholder:normal-case"
                    placeholder="Nh?p mã gi?m giá..."
                  />
                  <button type="button" onClick={handleApplyVoucher} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium px-4 py-2 rounded-lg transition-all">
                    Áp d?ng
                  </button>
                </div>
                {voucherError && <p className="text-red-400 text-xs">{voucherError}</p>}
                {appliedVoucher && <p className="text-green-400 text-xs font-medium">Ðã áp d?ng mã {appliedVoucher.code}: Gi?m {fmt(appliedVoucher.discountAmount)}d</p>}
              </div>
  `;

  content = content.replace(
    /\{\/\* Total Calculation \*\/\}/,
    voucherUI + '\n              {/* Total Calculation */}'
  );

  // 7. Update the final Total in UI
  content = content.replace(
    /<span className="text-cyan-400 font-bold text-2xl">\{fmt\(total\)\}d<\/span>/,
    `<span className="text-cyan-400 font-bold text-2xl">{fmt(appliedVoucher ? total - appliedVoucher.discountAmount : total)}d</span>`
  );

  fs.writeFileSync(p, content);
});
console.log('Fixed all service pages');
