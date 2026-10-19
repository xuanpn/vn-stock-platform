# 🏦 VN Stock Intelligence & Paper Trading Platform

Nền tảng phân tích chứng khoán chuyên nghiệp kết hợp **Tín hiệu Kỹ thuật + Chu kỳ Mùa vụ + Vĩ mô + Phân tích BCTC & Quản lý Danh mục Mua bán Giả lập (Paper Trading)** theo bảng giá thật.

---

## 📱 Hướng dẫn truy cập trên Máy tính & Điện thoại di động

Hệ thống đã được cấu hình mở cổng mạng nội bộ (`0.0.0.0`), cho phép bạn mở trực tiếp trên máy tính hoặc quét/gõ URL trên trình duyệt điện thoại (miễn là điện thoại cùng kết nối vào mạng Wi-Fi của cơ quan/gia đình):

### 1. Trên Máy tính (PC / Laptop):
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Backend**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Trên Điện thoại di động (Smartphone iOS / Android):
- Mở Safari, Chrome hoặc Cốc Cốc trên điện thoại và truy cập:
  👉 **`http://192.168.191.52:3000`**
- *Giao diện đã được thiết kế Responsive tối ưu cho màn hình cảm ứng: có thanh điều hướng dưới đáy (Bottom Navigation Tab), menu trượt, bảng vuốt mượt mà.*

---

## 💼 Tính năng Mua bán Giả lập (Paper Trading):

1. **Khởi tạo vốn đầu tư ban đầu**: Mặc định **500.000.000 VNĐ** (có nút đặt lại số dư bất kỳ lúc nào).
2. **Khớp lệnh theo giá thị trường thực**: Đặt mua/bán theo đúng thị giá real-time đang giao dịch trên sàn.
3. **Đặt lệnh ngoài giờ theo giá kỳ vọng**: Cho phép tick chọn *"Tự đặt giá khớp riêng"* để mua theo mức giá bạn muốn thử nghiệm.
4. **Theo dõi Lãi / Lỗ real-time**:
   - Hệ thống tự động lấy bảng giá thị trường thực tế đối chiếu liên tục mỗi phiên.
   - Thống kê chi tiết: **Giá vốn bình quân**, **Giá thị trường hiện tại**, **Lãi/Lỗ chưa chốt (Unrealized PnL & %)**, **Tổng NAV**.
5. **Tính phí giao dịch & thuế**: Mô phỏng phí môi giới (0.15%) và thuế bán chứng khoán (0.1%) chuẩn mực như tài khoản thật tại các CTCK.
6. **Lịch sử giao dịch (Order History)**: Lưu lại toàn bộ nhật ký mua/bán kèm ghi chú chiến lược.

---

## 🛠 Khởi chạy thủ công (nếu khởi động lại máy):

### Backend:
```powershell
cd d:\SP\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend:
```powershell
cd d:\SP\frontend
npm run dev -- --host 0.0.0.0 --port 3000
```
