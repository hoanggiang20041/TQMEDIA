import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tài liệu API | TQ MEDIA',
}

export default function ApiDocsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Tài liệu kết nối API</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Dành cho các chủ website hoặc lập trình viên muốn tự động hóa việc đặt đơn lên hệ thống TQ MEDIA.
        </p>
      </div>

      {/* API Key */}
      <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">key</span>
          Khóa API (API Key)
        </h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full flex bg-surface-variant/50 border border-outline-variant/30 rounded-xl overflow-hidden">
            <input 
              type="password" 
              readOnly 
              value="tqmedia_sk_live_8f92a3b1c4d5e6f7g8h9i0j1k2l3m4n5" 
              className="w-full bg-transparent text-white px-4 py-2.5 focus:outline-none font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 bg-surface-variant border border-outline-variant/30 text-white px-4 py-2.5 rounded-xl hover:bg-surface-variant/80 transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              Copy
            </button>
            <button className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Đổi Key
            </button>
          </div>
        </div>
        <p className="text-[11px] text-orange-400 mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          Tuyệt đối không để lộ API Key cho người khác, họ có thể dùng tiền trong tài khoản của bạn!
        </p>
      </div>

      {/* Code Mẫu */}
      <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">terminal</span>
          Code Mẫu (PHP cURL)
        </h2>
        
        <div className="relative group rounded-xl overflow-hidden border border-outline-variant/30">
          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button className="bg-surface-variant/80 hover:bg-surface-variant text-white p-2 rounded-lg backdrop-blur shadow-lg border border-outline-variant/50 flex items-center gap-2 text-xs">
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              Copy Code
            </button>
          </div>
          <pre className="p-5 overflow-x-auto text-sm text-cyan-50 font-mono bg-[#030305]/80">
            <code dangerouslySetInnerHTML={{ __html: `&lt;?php
  $api_url = 'https://tqmedia.net/api/v2';
  $api_key = 'tqmedia_sk_live_...';

  $data = [
      'key' => $api_key,
      'action' => 'add',
      'service' => 120, // ID dịch vụ
      'link' => 'https://facebook.com/post/123456',
      'quantity' => 1000
  ];

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $api_url);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);

  echo $response;
?&gt;` }} />
          </pre>
        </div>
      </div>
      
      {/* Tài liệu các phương thức */}
      <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">menu_book</span>
          Danh sách tham số
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/30">
                <th className="pb-3 pl-2 pr-4 font-semibold">Tham số</th>
                <th className="pb-3 pr-4 font-semibold">Bắt buộc</th>
                <th className="pb-3 font-semibold">Mô tả</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-outline-variant/10">
                <td className="py-4 pl-2 pr-4 text-cyan-400 font-mono text-sm">key</td>
                <td className="py-4 pr-4"><span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">Có</span></td>
                <td className="py-4 text-on-surface-variant text-sm">API Key của tài khoản bạn.</td>
              </tr>
              <tr className="border-b border-outline-variant/10">
                <td className="py-4 pl-2 pr-4 text-cyan-400 font-mono text-sm">action</td>
                <td className="py-4 pr-4"><span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">Có</span></td>
                <td className="py-4 text-on-surface-variant text-sm">Hành động cần thực hiện: <code className="bg-surface-variant px-1 rounded text-white">add</code>, <code className="bg-surface-variant px-1 rounded text-white">status</code>, <code className="bg-surface-variant px-1 rounded text-white">services</code>, <code className="bg-surface-variant px-1 rounded text-white">balance</code></td>
              </tr>
              <tr className="border-b border-outline-variant/10">
                <td className="py-4 pl-2 pr-4 text-cyan-400 font-mono text-sm">service</td>
                <td className="py-4 pr-4"><span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">Có</span></td>
                <td className="py-4 text-on-surface-variant text-sm">ID dịch vụ lấy từ bảng giá hoặc hành động <code className="bg-surface-variant px-1 rounded text-white">services</code>.</td>
              </tr>
              <tr className="border-b border-outline-variant/10">
                <td className="py-4 pl-2 pr-4 text-cyan-400 font-mono text-sm">link</td>
                <td className="py-4 pr-4"><span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">Có</span></td>
                <td className="py-4 text-on-surface-variant text-sm">Đường link cần buff tương tác.</td>
              </tr>
              <tr>
                <td className="py-4 pl-2 pr-4 text-cyan-400 font-mono text-sm">quantity</td>
                <td className="py-4 pr-4"><span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">Có</span></td>
                <td className="py-4 text-on-surface-variant text-sm">Số lượng cần mua.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
