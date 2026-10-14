# 🏃‍♂️ Thoát Khỏi Thiên Tai — Disaster Survival Online (4 Players)

Game sinh tồn nhiều người chơi trực tuyến (1-4 người) đối đầu với các thảm họa thiên tai tàn khốc, hỗ trợ chơi qua trình duyệt trên máy tính và điện thoại.

## 🌟 Tính Năng Nổi Bật

- **🌐 Chơi Online 4 Người Với Mã Phòng (Room Code)**:
  - Tự động tạo mã phòng 4 ký tự viết hoa (ví dụ: `JAKR`, `LUA7`...) với nút 1-click Copy.
  - Sử dụng công nghệ **WebRTC (PeerJS)** kết nối trực tiếp P2P qua internet, không cần cài đặt backend phức tạp.
  - Tích hợp **BroadcastChannel** cho phép mở 2-4 tab trên cùng máy tính để test thử ngay lập tức.
  - Chế độ quan sát (Ghost 👻) khi bị hạ gục và bảng xếp hạng trận đấu (Leaderboard 🏆) từ Hạng 1 đến Hạng 4.

- **❤️ Hệ Thống 100 HP & Nhặt Tim Hồi Máu**:
  - Mỗi người chơi bắt đầu với 100 HP. Thanh máu đổi màu trực quan theo lượng máu còn lại.
  - Nhặt vật phẩm Trái Tim ❤️ ngẫu nhiên trên sân để hồi phục từ +5 đến +10 HP.

- **🪤 Bẫy Kẹp (Phím 1)**:
  - Bẫy sắt hiện rõ trên sân (không tàng hình).
  - Bất kỳ ai bước vào (kể cả người thả nếu quay lại dẫm trúng) sẽ bị kẹp chân bất động 3 giây và mất 15 HP.
  - Có 1.8 giây đếm ngược an toàn khi gài bẫy để người đặt kịp bước ra ngoài.

- **💣 Mìn Tàng Hình (Phím 2)**:
  - Khi gài mìn, thông báo phát lên toàn phòng cảnh báo mọi người.
  - Mìn ẩn mình hoàn toàn 100% đối với đối thủ (người đặt chỉ thấy bóng mờ 25% để né).
  - Ai dẫm trúng (kể cả người đặt nếu quay lại) sẽ phát nổ rung chuyển màn hình và gây sát thương nổ lan 50 HP cho tất cả người chơi đứng lân cận trong bán kính 2 ô!

- **🌪️ Các Hiểm Họa Thiên Tai Đồng Thời**:
  - **🔥 Núi Lửa (Quét thẳng & Quét chéo)**: Sóng lửa càn quét toàn sân hoặc khoảng cách ngẫu nhiên.
  - **🔥 Lửa bén lan & Mưa dập lửa**: Đốm lửa bén lan lác đác từ điểm quét, nhưng khi bão sấm chớp đổ mưa hoặc vũng nước tràn tới sẽ dập tắt ngọn lửa thành khói trắng nghi ngút 💨.
  - **⚡ Bão Sấm Chớp & Vũng Nước Dẫn Điện**: Vũng nước bình thường hoàn toàn an toàn, nhưng khi bị sét đánh trúng sẽ phát sáng nhiễm điện cao thế giật mất máu.
  - **🌪️ Lốc Xoáy Khổng Lồ**: Tâm bão 3 tầng gió xoáy tự động đổi hướng lượn về phía người chơi.
  - **🕳️ Sụt Lở Đất (2-4 Vực Sâu)**: Mặt đất sụt lún thành các hố vực tử thần.
  - **💣 Bom Hẹn Giờ**: Đếm ngược giây phát nổ để lại miệng hố cháy xém.

## 🎮 Cách Điều Khiển

- **Di chuyển**: Phím mũi tên hoặc `W`, `A`, `S`, `D` (hoặc phím cảm ứng trên điện thoại).
- **Thả Bẫy Kẹp**: Nhấn phím `1` (hoặc nút `🪤 Bẫy (1)`).
- **Gài Mìn Tàng Hình**: Nhấn phím `2` (hoặc nút `💣 Mìn (2)`).
- **Tạm dừng**: Phím `Space` (trong chế độ Chơi Đơn).

## 🚀 Hướng Dẫn Chạy & Triển Khai

Game được viết 100% bằng HTML5, CSS3 và JavaScript thuần, không cần build hay cài thư viện Node.js:
1. Mở trực tiếp file `index.html` bằng trình duyệt web.
2. Hoặc tải lên **GitHub Pages** / **Vercel** / **Netlify** để lấy link chơi online miễn phí chia sẻ cho bạn bè.
