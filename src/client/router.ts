import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import LoginPage from './views/LoginPage.vue';
import UploadPage from './views/UploadPage.vue';
import AdminPage from './views/AdminPage.vue';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/upload' },
  { path: '/login', name: 'Login', component: LoginPage, meta: { public: true } },
  { path: '/upload', name: 'Upload', component: UploadPage, meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: AdminPage, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 简单通过cookie判断登录状态，实际应用中可以更完善
    if (!document.cookie.includes('auth_token=')) {
      next({ name: 'Login' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;