import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import PersonalCenter from '../views/PersonalCenter.vue'
import FarmStayDetail from '../views/FarmStayDetail.vue'
import PaymentView from '../views/PaymentView.vue'
import OrderDetail from '../views/OrderDetail.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/personal',
      name: 'personal',
      component: PersonalCenter,
    },
    {
      path: '/farmstays/:id',
      name: 'farmstay-detail',
      component: FarmStayDetail,
    },
    {
      path: '/pay/:orderId',
      name: 'payment',
      component: PaymentView,
    },
    {
      path: '/orders/:orderId',
      name: 'order-detail',
      component: OrderDetail,
    },
  ],
})

export default router
