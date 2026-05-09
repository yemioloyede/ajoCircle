import { Request, Response, NextFunction } from 'express'; import { verifyToken } from '../utils/security';
export type Role='MEMBER'|'GROUP_ADMIN'|'COMPLIANCE_ADMIN'|'SUPER_ADMIN';
declare global { namespace Express { interface Request { user?: {id:string; role:Role; email:string}; } } }
export function requireAuth(req:Request,res:Response,next:NextFunction){
  const h=req.headers.authorization; if(!h?.startsWith('Bearer ')) return res.status(401).json({error:'Missing token'});
  try{ req.user=verifyToken(h.slice(7)); next(); } catch{ return res.status(401).json({error:'Invalid or expired token'}); }
}
export function requireRole(...roles:Role[]){ return (req:Request,res:Response,next:NextFunction)=>{ if(!req.user) return res.status(401).json({error:'Unauthorized'}); if(!roles.includes(req.user.role)) return res.status(403).json({error:'Forbidden'}); next(); }; }
