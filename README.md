# 🏃‍♂️ Thoát Khỏi Thiên Tai — Disaster Survival Online (v2.0)

Game sinh tồn nhiều người chơi trực tuyến (1-4 người) đối đầu với các thảm họa thiên tai tàn khốc, hỗ trợ chơi qua trình duyệt trên máy tính và điện thoại.

## 🌟 Tính Năng Mới & Nổi Bật (v2.0)

- **🎨 Cửa Hàng Skin Đa Dạng (Skin Shop)**:
  - 12 bộ trang phục phong cách độc đáo: *Chiến Binh*, *Ninja Bóng Đêm*, *Chiến Binh Lửa*, *Băng Giá*, *Độc Tố Xanh*, *Hoàng Gia*, *Chiến Binh Cyber*, *Bóng Ma*, *Vàng Ròng*, *Cầu Vồng*, *Rồng Thần*, *Kim Cương*.
  - Nhận ngay **100 Xu khởi đầu** cho người chơi mới.
  - Kiếm thêm xu bằng cách nhặt đồng xu vàng 🪙 trên sàn đấu và sống sót qua từng giây hiểm họa.
  - Tự động lưu trang phục và số dư xu vào `localStorage`.
  - Hiển thị trực tiếp skin đã trang bị lên nhân vật trong cả chế độ Chơi Đơn lẫn Chơi Online nhiều người!

- **🔫 Vũ Khí Súng Laser & Bắn Người Chơi Khác**:
  - Nhặt biểu tượng Súng 🔫 trên sàn đấu: mỗi lần nhặt cộng **+1 viên đạn**, có thể tích trữ nhiều lần không giới hạn.
  - **Cách bắn linh hoạt**:
    - Nhấn phím `3`, phím `F` hoặc phím `J` để bắn theo hướng di chuyển hiện tại.
    - Hoặc **Click chuột trực tiếp lên màn hình** để ngắm bắn chính xác về phía con trỏ chuột!
    - Trên điện thoại: Nhấn nút `🔫 Bắn (3)` hoặc chạm nhanh (tap) vào màn hình.
  - Nhân vật hiển thị súng laser cầm trên tay khi còn đạn.
  - **Chế độ Chơi Online**: Đạn trúng đối thủ gây **35 HP sát thương**, hiệu ứng cháy nổ và rung giật màn hình chân thực!
  - **Chế độ Chơi Đơn (Solo)**: Bắn dập tắt ngay các đốm lửa và sóng lửa đang lan rộng, tạo làn khói trắng giải vây!

- **🛡️ Chế Độ Chơi Đơn (Solo) Tinh Gọn — Không Bẫy, Mìn**:
  - Khi chơi đơn, toàn bộ khe đồ Bẫy 🪤 và Mìn 💣 sẽ được ẩn đi, chỉ hiển thị Máu ❤️ và Súng 🔫.
  - Không sinh ra bẫy và mìn ngẫu nhiên trên bản đồ để tập trung hoàn toàn vào kỹ năng né tránh thiên tai và bắn súng sinh tồn.

- **🌐 Chơi Online 4 Người Với Mã Phòng (Room Code)**:
  - Tự động tạo mã phòng 4 ký tự viết hoa (ví dụ: `JAKR`, `LUA7`...) với nút 1-click Copy.
  - Kết nối P2P thời gian thực bằng **WebRTC (PeerJS)** và **BroadcastChannel**.
  - Bảng xếp hạng trực quan sau trận đấu, đồng bộ hóa vị trí, trang phục, máu và đạn dược.

- **🪤 Bẫy Kẹp & 💣 Mìn Tàng Hình (Chế Độ Online)**:
  - **Bẫy Kẹp (Phím 1)**: Kẹp chân bất động 3 giây và mất 15 HP.
  - **Mìn Tàng Hình (Phím 2)**: Ẩn mình với đối thủ, phát nổ nổ lan bán kính 2 ô gây 50 HP sát thương.

- **🌪️ Các Hiểm Họa Thiên Tai Đồng Thời**:
  - **🔥 Núi Lửa (Quét thẳng & Quét chéo)**: Sóng lửa càn quét toàn sân.
  - **🔥 Lửa bén lan & Mưa dập lửa**: Đốm lửa bén lan tự nhiên, bị dập khi gặp mưa sét hoặc đạn súng.
  - **⚡ Bão Sấm Chớp & Vũng Nước Dẫn Điện**: Vũng nước nhiễm điện cao thế khi bị sét đánh trúng.
  - **🌪️ Lốc Xoáy Khổng Lồ**: Tâm bão 3 tầng gió xoáy tự lượn về phía người chơi.
  - **🕳️ Sụt Lở Đất (2-4 Vực Sâu)**: Mặt đất sụt lún thành các hố tử thần.
  - **💣 Bom Hẹn Giờ**: Đếm ngược giây phát nổ để lại hố cháy xém.

## 🎮 Hướng Dẫn Điều Khiển

| Thao tác | Phím máy tính | Cảm ứng điện thoại |
| :--- | :--- | :--- |
| **Di chuyển** | Phím mũi tên hoặc `W`, `A`, `S`, `D` | Nút mũi tên hoặc Vuốt (Swipe) |
| **Bắn súng 🔫** | Phím `3`, phím `F`, phím `J` hoặc **Click chuột ngắm bắn** | Nút `🔫 Bắn (3)` hoặc Chạm (Tap) |
| **Thả Bẫy 🪤 (Online)** | Phím `1` | Nút `🪤 Bẫy (1)` |
| **Gài Mìn 💣 (Online)** | Phím `2` | Nút `💣 Mìn (2)` |
| **Tạm dừng ⏸️** | Phím `Space` (Chơi đơn) | Nhấn nút tạm dừng |

## 🚀 Hướng Dẫn Chạy Game

Game được phát triển 100% bằng HTML5 Canvas, CSS3 và Vanilla JavaScript thuần, không cần build phức tạp:
1. Mở file `index.html` trực tiếp trên bất kỳ trình duyệt web hiện đại nào (Chrome, Edge, Firefox, Safari).
2. Hoặc triển khai lên **GitHub Pages**, **Vercel** hoặc **Netlify** chỉ bằng 1 cú kéo thả thư mục.
