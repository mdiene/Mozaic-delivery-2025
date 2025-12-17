
import React, { useState } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Truck, Lock, Mail, ArrowRight, UserPlus, AlertCircle } from 'lucide-react';
import { db } from '../services/db';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Role map for user_right_level
  const roleToLevel: Record<string, number> = {
    'ADMIN': 3,
    'MANAGER': 2,
    'DRIVER': 1
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        // DRIVER: Direct access without password (as per existing simplified logic)
        if ((selectedRole as string) === 'DRIVER') {
          login(`driver-${Date.now()}@masae.sn`, 'DRIVER', 'Chauffeur');
          navigate('/logistics/fifo');
          return;
        }

        // MANAGER: Simplified access - Only password verification required (no status check)
        if ((selectedRole as string) === 'MANAGER') {
          const userPrefs = await db.authenticateUser('manager@site.sn', password);
          if (userPrefs) {
             // Success: Bypass user_statut check for Manager as requested ("remove connection control")
             login(userPrefs.user_email || 'manager@site.sn', 'MANAGER', 'Manager Site');
             navigate('/logistics/fifo');
             return;
          } else {
             setError("Mot de passe incorrect.");
             setIsSubmitting(false);
             return;
          }
        }

        // ADMIN: Full authentication with Email, Password and Status verification
        const userPrefs = await db.authenticateUser(email, password);
        
        if (userPrefs) {
          // Check if account is active for Admin
          if (userPrefs.user_statut === false) {
            setError("Compte inactif. Votre accès doit être validé par un administrateur.");
            setIsSubmitting(false);
            return;
          }

          // Check if right level matches
          const requiredLevel = roleToLevel[selectedRole as string];
          if (userPrefs.user_right_level !== requiredLevel) {
            setError("Rôle incorrect pour cet utilisateur.");
          } else {
            login(userPrefs.user_email, selectedRole, userPrefs.user_email.split('@')[0]);
            navigate('/');
          }
        } else {
          setError("Identifiants incorrects.");
        }
      } else {
        // SIGNUP - Only for Admin
        if (selectedRole !== 'ADMIN') {
          setError("Seul un administrateur peut créer un compte.");
          setIsSubmitting(false);
          return;
        }

        await db.createUserAccount({
          user_email: email,
          user_pswd: password,
          user_right_level: roleToLevel['ADMIN'],
          theme_mode: 'light',
          theme_color: 'default',
          sidebar_pinned: false,
          language: 'fr'
        });

        alert("Demande de création de compte envoyée ! Votre compte est actuellement INACTIF et doit être validé par un administrateur existant avant de pouvoir vous connecter.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    { id: 'ADMIN' as UserRole, label: 'Administrateur', icon: ShieldCheck, desc: 'Gestion complète du système' },
    { id: 'MANAGER' as UserRole, label: 'Manager (Site)', icon: User, desc: 'FIFO, BL, Itinéraire, Frais' },
    { id: 'DRIVER' as UserRole, label: 'Utilisateur (Chauffeur)', icon: Truck, desc: 'Validation Entrée & QR Code' },
  ];

  // Only Admin can see the signup toggle
  const showSignupToggle = selectedRole === 'ADMIN';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-4xl bg-card rounded-3xl shadow-soft-xl border border-border overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500">
        
        <div className="w-full md:w-5/12 bg-primary p-8 md:p-12 text-primary-foreground flex flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Truck size={200} className="rotate-12" />
           </div>
           
           <div className="relative z-10">
              <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md">
                 <span className="text-2xl font-black">M</span>
              </div>
              <h1 className="text-3xl font-bold mb-4 tracking-tight">MASAE Delivery Tracker</h1>
              <p className="text-primary-foreground/80 leading-relaxed">
                 Solution moderne pour la gestion des intrants agricoles au Sénégal. Optimisez vos flux logistiques en temps réel.
              </p>
           </div>

           <div className="relative z-10 mt-8">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/60 mb-2">Partenaires</p>
              <div className="flex gap-4 items-center">
                 <span className="font-bold opacity-80">SOMA</span>
                 <div className="w-px h-4 bg-white/20"></div>
                 <span className="font-bold opacity-80 uppercase text-[10px]">Wague Agro Business</span>
              </div>
           </div>
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-12">
          {showSignupToggle && (
            <div className="flex justify-end mb-8">
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-sm font-bold text-primary hover:underline flex items-center gap-2"
              >
                {isLogin ? <><UserPlus size={16}/> Créer un compte</> : <><Lock size={16}/> Se connecter</>}
              </button>
            </div>
          )}

          <h2 className="text-2xl font-bold text-foreground mb-2">
            {selectedRole === 'DRIVER' ? 'Accès Chauffeur' : isLogin ? 'Bon retour parmi nous' : 'Créer un compte Admin'}
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            {selectedRole === 'DRIVER' 
              ? 'Accédez directement à la file d\'attente.' 
              : isLogin 
                ? (selectedRole === 'MANAGER' ? 'Saisissez votre mot de passe pour accéder au site.' : 'Connectez-vous pour accéder à votre espace de travail.') 
                : 'Enregistrez un nouvel administrateur système.'}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive text-sm animate-in shake duration-300">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground tracking-widest mb-4">Votre Rôle</label>
              <div className="grid grid-cols-1 gap-3">
                {roles.map((role) => {
                  const Icon = role.icon;
                  const isActive = selectedRole === role.id;
                  return (
                    <div 
                      key={role.id}
                      onClick={() => {
                        setSelectedRole(role.id);
                        if (role.id !== 'ADMIN') setIsLogin(true);
                        setError('');
                      }}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50 bg-card'}`}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>{role.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{role.desc}</p>
                      </div>
                      {isActive && <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center"><ArrowRight size={10} className="text-white" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedRole !== 'DRIVER' && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                {!isLogin && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      type="text" 
                      placeholder="Nom complet" 
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                {/* Email is hidden for Manager Login */}
                {(selectedRole === 'ADMIN' || !isLogin) && (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      type="email" 
                      placeholder="Adresse email" 
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input 
                    type="password" 
                    placeholder="Mot de passe" 
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold shadow-soft-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:translate-y-0"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {selectedRole === 'DRIVER' ? 'Accéder Directement' : isLogin ? 'Se connecter' : 'Créer le compte'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
