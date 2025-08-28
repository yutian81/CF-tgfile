<template>
    <router-view />
  </template>
  
  <script setup lang="ts">
  import { onMounted } from 'vue';
  
  // 1. 定义 API 响应的类型接口
  interface BingImage {
    url: string;
  }
  
  interface BingApiResponse {
    status: boolean;
    data: BingImage[];
    message?: string; // message 属性没用到，可以设为可选
  }
  
  const setBingBackground = async () => {
    try {
      const response = await fetch('/api/bing');
      if (!response.ok) return;
  
      // 2. 将返回的 json 数据断言为定义的类型
      const data = await response.json<BingApiResponse>();
  
      if (data.status && data.data?.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.data.length);
        document.body.style.backgroundImage = `url(${data.data[randomIndex].url})`;
      }
    } catch (error) {
      console.error('获取背景图失败:', error);
    }
  };
  
  onMounted(() => {
    setBingBackground();
    setInterval(setBingBackground, 3600000);
  });
  </script>
  
  <style>
  /* 全局样式 */
  body {
    margin: 0;
    font-family: Arial, sans-serif;
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    transition: background-image 1s ease-in-out;
  }
  </style>