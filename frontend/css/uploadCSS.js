export const uploadCSS = `
body {
  font-family: Arial, sans-serif;
  transition: background-image 1s ease-in-out;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f5f5f5;
  margin: 0;
}
.container {
  width: 800px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 10px 40px 20px 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.upload-area {
  border: 2px dashed #666;
  padding: 40px;
  text-align: center;
  margin: 0 auto;
  border-radius: 8px;
  transition: all 0.3s;
  box-sizing: border-box;
}
.upload-area p {
  line-height: 2;
}
.upload-area.dragover {
  border-color: #007bff;
  background: #f8f9fa;
}
.preview-area {
  margin-top: 20px;
}
.preview-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  border-radius: 4px;
}
.preview-item img {
  max-width: 100px;
  max-height: 100px;
  margin-right: 10px;
}
.preview-item .info {
  flex-grow: 1;
}
.url-area {
  margin-top: 10px;
  width: calc(100% - 20px);
  box-sizing: border-box;
}
.url-area textarea {
  width: 100%;
  min-height: 100px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  color: #333;       
}
.admin-link {
  background: #007BFF;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  text-decoration: none;
  color: #fff;     
  display: inline-block;
  margin-left: auto;
}
.admin-link:hover {
  text-decoration: underline;
}
.button-container {
  display: flex;
  align-items: center;
  margin: 15px 0;
  width: 100%;
}
.button-container button {
  margin-right: 10px;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
}
.button-container button:hover {
  background: #0056b3;
}
.progress-bar {
  height: 20px;
  background: #eee;
  border-radius: 10px;
  margin: 8px 0;
  overflow: hidden;
  position: relative;
}
.progress-track {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
  width: 0;
}
.progress-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
}
.success .progress-track {
  background: #28a745;
}
.error .progress-track {
  background: #dc3545;
}

/* 版权页脚 */
footer {
  font-size: 0.85rem;
  width: 100%;
  text-align: center;
  margin: 0;
}
footer p {
  color: #7F7F7E;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}
/* 手机屏幕下居中 */
@media (max-width: 768px) {
  footer p {
    justify-content: center;
  }
}
footer a {
  color: #7F7F7E;
  text-decoration: none;
  transition: color 0.3s ease;
}
footer a:hover {
  color: #007BFF !important;
}
`;
