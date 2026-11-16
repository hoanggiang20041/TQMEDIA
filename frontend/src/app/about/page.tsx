'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import TopNavbar from '@/components/layout/TopNavbar';
import Footer from '@/components/layout/Footer';
import { useRole } from '@/context/RoleContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const defaultData = {
  hero: { title: 'Về TQMEDIA', desc: 'Đơn vị tiên phong trong giải pháp tự động hóa Marketing mạng xã hội tại Việt Nam.' },
  vision: { title: 'Tầm nhìn', desc: 'Trở thành nền tảng tự động hóa marketing mạng xã hội hàng đầu khu vực...' },
  mission: { title: 'Sứ mệnh', desc: 'Cung cấp các giải pháp công nghệ tiên tiến...' },
  stats: [
    { value: '5+', label: 'Năm kinh nghiệm' },
    { value: '10k+', label: 'Khách hàng' },
    { value: '50M+', label: 'Tương tác tạo ra' },
    { value: '99%', label: 'Hài lòng' }
  ],
  teamTitle: 'Đội ngũ của chúng tôi',
  teamDesc: 'Những con người tâm huyết đứng sau sự thành công của TQMEDIA.',
  team: [
    { name: 'Nguyễn Văn A', role: 'CEO & Founder', avatar: 'https://lh3.googleusercontent.com/a/ACg8ocLw_w1B6G_J-YgH1x0jUo9n1f7_z8UvT3B-n-UfO9d7=s288-c-no' },
  ]
};

export default function AboutPage() {
  const { role } = useRole();
  const isAdmin = role === 'ADMIN';
  
  const [data, setData] = useState<any>(defaultData);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pages/about')
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.content) {
          try {
            setData(JSON.parse(resData.content));
          } catch(e) {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/admin/pages/about', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'Giới thiệu', content: JSON.stringify(data) })
      });
      if (res.ok) {
        MySwal.fire({ icon: 'success', title: 'Lưu thành công', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        setIsEditing(false);
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể lưu thay đổi' });
    }
  };

  const editClass = isEditing ? 'outline-none ring-2 ring-primary/30 ring-dashed rounded px-1 cursor-text transition-all bg-primary/5' : '';

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative">
      <TopNavbar />

      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-3">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="bg-surface-variant/80 text-on-surface hover:bg-surface-variant px-5 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
                Hủy
              </button>
              <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transition-all">
                <span className="material-symbols-outlined">save</span>
                Lưu Thay Đổi
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90 text-on-primary px-5 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transition-all animate-bounce hover:animate-none">
              <span className="material-symbols-outlined">edit</span>
              Bật Chế Độ Sửa
            </button>
          )}
        </div>
      )}

      <main className={`flex-grow pt-24 pb-16 transition-all ${isEditing ? 'border-4 border-dashed border-primary/50' : ''}`}>
        
        {/* Hero Section */}
        <section className="relative px-6 py-20 overflow-hidden text-center group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 
              className={`text-4xl md:text-6xl font-black text-on-surface mb-6 tracking-tight ${editClass}`}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={e => setData({...data, hero: {...data.hero, title: e.currentTarget.textContent}})}
            >{data.hero.title}</h1>
            
            <p 
              className={`text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed ${editClass}`}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={e => setData({...data, hero: {...data.hero, desc: e.currentTarget.textContent}})}
            >{data.hero.desc}</p>
          </div>
        </section>

        {/* Mission/Vision Section */}
        <section className="px-6 py-12">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl relative overflow-hidden transition-all duration-300 hover:bg-surface-variant/30 ${isEditing ? 'ring-2 ring-primary/50' : ''}`}>
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 text-primary border border-primary/30">
                <span className="material-symbols-outlined text-3xl">visibility</span>
              </div>
              <h2 
                className={`text-2xl font-bold text-on-surface mb-4 ${editClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => setData({...data, vision: {...data.vision, title: e.currentTarget.textContent}})}
              >{data.vision.title}</h2>
              <p 
                className={`text-base text-on-surface-variant leading-relaxed ${editClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => setData({...data, vision: {...data.vision, desc: e.currentTarget.textContent}})}
              >{data.vision.desc}</p>
            </div>

            <div className={`bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl relative overflow-hidden transition-all duration-300 hover:bg-surface-variant/30 ${isEditing ? 'ring-2 ring-primary/50' : ''}`}>
              <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center mb-6 text-secondary border border-secondary/30">
                <span className="material-symbols-outlined text-3xl">rocket_launch</span>
              </div>
              <h2 
                className={`text-2xl font-bold text-on-surface mb-4 ${editClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => setData({...data, mission: {...data.mission, title: e.currentTarget.textContent}})}
              >{data.mission.title}</h2>
              <p 
                className={`text-base text-on-surface-variant leading-relaxed ${editClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => setData({...data, mission: {...data.mission, desc: e.currentTarget.textContent}})}
              >{data.mission.desc}</p>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section className={`px-6 py-16 bg-surface/50 border-y border-outline-variant/30 relative overflow-hidden ${isEditing ? 'ring-2 ring-primary/50' : ''}`}>
          <div className="max-w-5xl mx-auto relative z-10 flex flex-wrap justify-center gap-8">
            {data.stats.map((stat: any, index: number) => (
              <div key={index} className="text-center relative group min-w-[150px]">
                {isEditing && (
                  <button 
                    onClick={() => {
                      const newStats = [...data.stats];
                      newStats.splice(index, 1);
                      setData({...data, stats: newStats});
                    }}
                    className="absolute -top-4 -right-4 bg-red-500/80 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    title="Xóa số liệu này"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
                <div 
                  className={`text-4xl md:text-5xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] ${editClass}`}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={e => {
                    const newStats = [...data.stats];
                    newStats[index].value = e.currentTarget.textContent;
                    setData({...data, stats: newStats});
                  }}
                >{stat.value}</div>
                <div 
                  className={`text-sm font-semibold text-on-surface-variant uppercase tracking-wider mt-2 ${editClass}`}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={e => {
                    const newStats = [...data.stats];
                    newStats[index].label = e.currentTarget.textContent;
                    setData({...data, stats: newStats});
                  }}
                >{stat.label}</div>
              </div>
            ))}
            {isEditing && (
              <button 
                onClick={() => {
                  setData({...data, stats: [...data.stats, { value: '0', label: 'Mới' }]});
                }}
                className="flex flex-col items-center justify-center border-2 border-dashed border-primary/50 hover:bg-primary/10 rounded-2xl p-6 transition-colors text-center min-w-[150px]"
              >
                <span className="material-symbols-outlined text-4xl text-primary mb-2">add_circle</span>
                <span className="font-label-sm text-primary uppercase">Thêm số liệu</span>
              </button>
            )}
          </div>
        </section>

        {/* Team Section */}
        <section className={`px-6 py-24 ${isEditing ? 'ring-2 ring-primary/50' : ''}`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className={`text-3xl md:text-5xl font-bold text-on-surface mb-4 tracking-tight inline-block ${editClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => setData({...data, teamTitle: e.currentTarget.textContent})}
              >{data.teamTitle}</h2>
              <p 
                className={`text-lg text-on-surface-variant max-w-2xl mx-auto ${editClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => setData({...data, teamDesc: e.currentTarget.textContent})}
              >{data.teamDesc}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {data.team.map((member: any, index: number) => (
                <div key={index} className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-6 rounded-2xl text-center group transition-all duration-300 hover:bg-surface-variant/30 hover:-translate-y-2 relative w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.2rem)] min-w-[200px]">
                  {isEditing && (
                    <button 
                      onClick={() => {
                        const newTeam = [...data.team];
                        newTeam.splice(index, 1);
                        setData({...data, team: newTeam});
                      }}
                      className="absolute -top-4 -right-4 bg-red-500/80 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      title="Xóa nhân sự này"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                  <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary/50 transition-colors">
                    <Image
                      src={member.avatar || 'https://lh3.googleusercontent.com/a/ACg8ocLw_w1B6G_J-YgH1x0jUo9n1f7_z8UvT3B-n-UfO9d7=s288-c-no'}
                      alt={member.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  
                  {isEditing && (
                    <input 
                      className="w-full text-xs bg-surface-variant/50 p-1 rounded outline-none mb-3 text-on-surface text-center" 
                      placeholder="Nhập link ảnh..." 
                      value={member.avatar} 
                      onChange={e => {
                        const newTeam = [...data.team];
                        newTeam[index].avatar = e.target.value;
                        setData({...data, team: newTeam});
                      }} 
                    />
                  )}

                  <h3 
                    className={`text-lg font-bold text-on-surface mb-1 ${editClass}`}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onBlur={e => {
                      const newTeam = [...data.team];
                      newTeam[index].name = e.currentTarget.textContent;
                      setData({...data, team: newTeam});
                    }}
                  >{member.name}</h3>
                  
                  <p 
                    className={`text-sm font-medium text-primary ${editClass}`}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onBlur={e => {
                      const newTeam = [...data.team];
                      newTeam[index].role = e.currentTarget.textContent;
                      setData({...data, team: newTeam});
                    }}
                  >{member.role}</p>
                </div>
              ))}
              
              {isEditing && (
                <button 
                  onClick={() => {
                    setData({...data, team: [...data.team, { name: 'Tên mới', role: 'Vị trí', avatar: '' }]});
                  }}
                  className="bg-surface border-2 border-dashed border-primary/50 hover:bg-primary/10 rounded-2xl flex flex-col items-center justify-center p-6 min-h-[250px] transition-colors w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.2rem)] min-w-[200px]"
                >
                  <span className="material-symbols-outlined text-4xl text-primary mb-2">person_add</span>
                  <span className="text-sm font-bold text-primary uppercase">Thêm nhân sự</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
