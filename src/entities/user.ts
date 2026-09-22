/** 관리자 사용자 (LinkedIn 계정으로 로그인) */
export interface User {
  id: string;
  /** LinkedIn OpenID Connect 의 sub 클레임 — 계정 식별자 */
  linkedinSub: string;
  /** 게시 API 의 author 에 넣는 값. urn:li:person:{sub} */
  personUrn: string;

  name: string;
  email: string | null;
  avatarUrl: string | null;

  createdAt: string;
  lastLoginAt: string;
}

/** 쿠키에 담기는 최소 세션 정보 (토큰은 절대 담지 않는다) */
export interface SessionUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
}
