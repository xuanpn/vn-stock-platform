
import xlrd
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from collections import defaultdict

# ==================== READ FILE 1 - Sheet T8 ====================
f1 = r'd:\SP\DS  NOP BH NAM 2026_TOAN TINH.xls'
wb1 = xlrd.open_workbook(f1)
ws1 = wb1.sheet_by_name('T8')

# col 1=Ho va ten, col 9=Tien luong dong BHXH
# Dùng list để lưu (tên, lương, row)
records_f1 = []
for r in range(9, ws1.nrows):
    ten = str(ws1.cell_value(r, 1)).strip()
    luong_raw = ws1.cell_value(r, 9)
    if ten and isinstance(luong_raw, (int, float)) and luong_raw > 0:
        records_f1.append({'ten': ten, 'luong': float(luong_raw), 'row': r + 1})

# ==================== READ FILE 2 ====================
f2 = r'd:\SP\NHCS 25.8 DANH_SACH_THAM_GIA_BHBB_2026082575058.xls'
wb2 = xlrd.open_workbook(f2)
ws2 = wb2.sheet_by_index(0)

# col 1=Ho va ten, col 14=Tien luong dong BHXH
records_f2 = []
for r in range(10, ws2.nrows):
    ten = str(ws2.cell_value(r, 1)).strip()
    luong_raw = ws2.cell_value(r, 14)
    if ten and isinstance(luong_raw, (int, float)) and luong_raw > 0:
        records_f2.append({'ten': ten, 'luong': float(luong_raw), 'row': r + 1})

# Index by name (list to handle duplicates)
idx_f1 = defaultdict(list)
for rec in records_f1:
    idx_f1[rec['ten']].append(rec)

idx_f2 = defaultdict(list)
for rec in records_f2:
    idx_f2[rec['ten']].append(rec)

names_f1 = set(idx_f1.keys())
names_f2 = set(idx_f2.keys())
common = names_f1 & names_f2

# Find differences
diff_list = []
for ten in common:
    recs1 = idx_f1[ten]
    recs2 = idx_f2[ten]
    # Match by index (1st<->1st, 2nd<->2nd for duplicates)
    for i in range(max(len(recs1), len(recs2))):
        r1 = recs1[i] if i < len(recs1) else None
        r2 = recs2[i] if i < len(recs2) else None
        if r1 and r2:
            chenh = r2['luong'] - r1['luong']
            if abs(chenh) > 1:
                diff_list.append({
                    'ten': ten,
                    'luong_f1': r1['luong'],
                    'luong_f2': r2['luong'],
                    'chenh_lech': chenh,
                    'row_f1': r1['row'],
                    'row_f2': r2['row'],
                    'is_dup': len(recs1) > 1 or len(recs2) > 1
                })

only_f1 = sorted(names_f1 - names_f2)
only_f2 = sorted(names_f2 - names_f1)

diff_list.sort(key=lambda x: abs(x['chenh_lech']), reverse=True)

print(f'File 1 T7: {len(records_f1)} nguoi')
print(f'File 2:    {len(records_f2)} nguoi')
print(f'Chung ten: {len(common)} ten')
print(f'Luong lech: {len(diff_list)} truong hop')
print(f'Chi co F1:  {len(only_f1)} nguoi')
print(f'Chi co F2:  {len(only_f2)} nguoi')

# ==================== EXPORT EXCEL ====================
wb_out = openpyxl.Workbook()

# --- Styles ---
HEADER_FILL  = PatternFill("solid", fgColor="1A237E")
SUBHDR_FILL  = PatternFill("solid", fgColor="283593")
ORANGE_FILL  = PatternFill("solid", fgColor="E65100")
GREEN_FILL   = PatternFill("solid", fgColor="1B5E20")
GRAY_FILL    = PatternFill("solid", fgColor="F5F5F5")
RED_ROW      = PatternFill("solid", fgColor="FFEBEE")
GREEN_ROW    = PatternFill("solid", fgColor="E8F5E9")
YELLOW_ROW   = PatternFill("solid", fgColor="FFFDE7")
DUP_FILL     = PatternFill("solid", fgColor="FFF3E0")

def bold_white(sz=11): return Font(name='Times New Roman', bold=True, color="FFFFFF", size=sz)
def normal(sz=11, color="000000", bold=False, size=None):
    return Font(name='Times New Roman', size=size if size is not None else sz, color=color, bold=bold)

thin = Border(left=Side(style='thin'), right=Side(style='thin'),
              top=Side(style='thin'), bottom=Side(style='thin'))
C = Alignment(horizontal='center', vertical='center', wrap_text=True)
L = Alignment(horizontal='left',   vertical='center', wrap_text=True)
R = Alignment(horizontal='right',  vertical='center')

def hdr(ws, row, col, val, fill=None, font=None, align=C):
    c = ws.cell(row=row, column=col, value=val)
    c.fill = fill or HEADER_FILL
    c.font = font or bold_white()
    c.alignment = align
    c.border = thin

def cell(ws, row, col, val, fill=None, font=None, align=L, fmt=None):
    c = ws.cell(row=row, column=col, value=val)
    if fill: c.fill = fill
    c.font = font or normal()
    c.alignment = align
    c.border = thin
    if fmt: c.number_format = fmt

# ========== SHEET 1: Lương lệch nhau ==========
ws_d = wb_out.active
ws_d.title = 'Luong lech nhau'

# Row 1: Main title
ws_d.merge_cells('A1:H1')
t = ws_d['A1']
t.value = 'DANH SÁCH CÓ CÙNG TÊN NHƯNG MỨC LƯƠNG ĐÓNG BẢO HIỂM KHÁC NHAU'
t.font  = Font(name='Times New Roman', bold=True, size=14, color="FFFFFF")
t.fill  = HEADER_FILL; t.alignment = C
ws_d.row_dimensions[1].height = 32

# Row 2: Sub-info
ws_d.merge_cells('A2:H2')
s = ws_d['A2']
s.value = 'So sánh: File 1 (DS NOP BH NAM 2026 - Sheet T8)  vs  File 2 (NHCS 25.8 DANH_SACH_THAM_GIA_BHBB.xls)  |  Tháng 8/2026'
s.font  = Font(name='Times New Roman', italic=True, size=10, color="37474F")
s.alignment = C; s.fill = PatternFill("solid", fgColor="E8EAF6")
ws_d.row_dimensions[2].height = 18

# Row 3: Stats
ws_d.merge_cells('A3:H3')
stat = ws_d['A3']
stat.value = (f'Tổng: {len(records_f1)} người (File 1)  |  {len(records_f2)} người (File 2)  |  '
              f'Có mặt ở cả 2 file: {len(common)} tên  |  Lệch lương: {len(diff_list)} trường hợp')
stat.font = Font(name='Times New Roman', bold=True, size=10, color="1A237E")
stat.alignment = C; stat.fill = PatternFill("solid", fgColor="C5CAE9")
ws_d.row_dimensions[3].height = 18

# Row 4: Column headers
hs = ['STT', 'Họ và tên', 'Hàng F1', 'Hàng F2',
      'Lương đóng BH\n(File 1 - DS Nộp)', 'Lương đóng BH\n(File 2 - NHCS)',
      'Chênh lệch\n(F2 – F1)', 'Ghi chú']
for ci, h in enumerate(hs, 1):
    hdr(ws_d, 4, ci, h)
ws_d.row_dimensions[4].height = 42

ws_d.column_dimensions['A'].width = 5
ws_d.column_dimensions['B'].width = 28
ws_d.column_dimensions['C'].width = 9
ws_d.column_dimensions['D'].width = 9
ws_d.column_dimensions['E'].width = 22
ws_d.column_dimensions['F'].width = 22
ws_d.column_dimensions['G'].width = 22
ws_d.column_dimensions['H'].width = 30
ws_d.freeze_panes = 'A5'

for i, d in enumerate(diff_list, 1):
    r = i + 4
    chenh = d['chenh_lech']
    is_dup = d['is_dup']

    if is_dup:
        row_fill = DUP_FILL
    elif chenh < 0:
        row_fill = RED_ROW
    else:
        row_fill = GREEN_ROW

    chenh_fill = PatternFill("solid", fgColor="FFCDD2") if chenh < 0 else PatternFill("solid", fgColor="C8E6C9")
    chenh_font = normal(bold=True, color="B71C1C" if chenh < 0 else "1B5E20")

    cell(ws_d, r, 1, i,            fill=row_fill, align=C)
    cell(ws_d, r, 2, d['ten'],     fill=row_fill)
    cell(ws_d, r, 3, d['row_f1'],  fill=row_fill, align=C)
    cell(ws_d, r, 4, d['row_f2'],  fill=row_fill, align=C)
    cell(ws_d, r, 5, d['luong_f1'],fill=row_fill, align=R, fmt='#,##0')
    cell(ws_d, r, 6, d['luong_f2'],fill=row_fill, align=R, fmt='#,##0')
    cell(ws_d, r, 7, chenh,        fill=chenh_fill, font=chenh_font, align=R, fmt='+#,##0;-#,##0')
    note = ('Tên trùng lặp - ' if is_dup else '') + ('File 2 cao hơn' if chenh > 0 else 'File 1 cao hơn')
    cell(ws_d, r, 8, note, fill=chenh_fill, font=chenh_font)
    ws_d.row_dimensions[r].height = 17

# Total row
tr = len(diff_list) + 5
ws_d.merge_cells(f'A{tr}:D{tr}')
tc = ws_d.cell(row=tr, column=1, value=f'TỔNG CỘNG: {len(diff_list)} trường hợp lệch lương')
tc.font = normal(bold=True, size=11, color="FFFFFF")
tc.fill = HEADER_FILL; tc.alignment = C; tc.border = thin

# sum chenh
pos_sum = sum(d['chenh_lech'] for d in diff_list if d['chenh_lech'] > 0)
neg_sum = sum(d['chenh_lech'] for d in diff_list if d['chenh_lech'] < 0)
cell(ws_d, tr, 5, '', fill=HEADER_FILL)
cell(ws_d, tr, 6, '', fill=HEADER_FILL)
cell(ws_d, tr, 7, '', fill=HEADER_FILL)
info = f'F2 cao hơn: {len([d for d in diff_list if d["chenh_lech"]>0])} người  |  F1 cao hơn: {len([d for d in diff_list if d["chenh_lech"]<0])} người'
ws_d.merge_cells(f'E{tr}:H{tr}')
ci = ws_d.cell(row=tr, column=5, value=info)
ci.font = normal(bold=True, size=10, color="FFFFFF")
ci.fill = HEADER_FILL; ci.alignment = C; ci.border = thin

# ========== SHEET 2: Chỉ có trong File 1 ==========
ws_1 = wb_out.create_sheet('Chi co trong File 1')
ws_1.merge_cells('A1:E1')
t1 = ws_1['A1']
t1.value = 'DANH SÁCH CHỈ CÓ TRONG FILE 1 (DS NỘP BH T7) – Không tìm thấy trong File 2 NHCS'
t1.font = Font(name='Times New Roman', bold=True, size=12, color="FFFFFF")
t1.fill = ORANGE_FILL; t1.alignment = C
ws_1.row_dimensions[1].height = 28

for ci, h in enumerate(['STT', 'Họ và tên', 'Dòng trong File 1', 'Lương đóng BH (File 1)', 'Ghi chú'], 1):
    hdr(ws_1, 2, ci, h, fill=PatternFill("solid", fgColor="BF360C"))
ws_1.row_dimensions[2].height = 32

ws_1.column_dimensions['A'].width = 6
ws_1.column_dimensions['B'].width = 30
ws_1.column_dimensions['C'].width = 18
ws_1.column_dimensions['D'].width = 22
ws_1.column_dimensions['E'].width = 45
ws_1.freeze_panes = 'A3'

for i, ten in enumerate(sorted(only_f1), 1):
    r = i + 2
    row_fill = GRAY_FILL if i % 2 == 0 else YELLOW_ROW
    recs = idx_f1[ten]
    for j, rec in enumerate(recs):
        rr = r + j
        cell(ws_1, rr, 1, i if j == 0 else '', fill=row_fill, align=C)
        cell(ws_1, rr, 2, ten, fill=row_fill)
        cell(ws_1, rr, 3, rec['row'], fill=row_fill, align=C)
        cell(ws_1, rr, 4, rec['luong'], fill=row_fill, align=R, fmt='#,##0')
        cell(ws_1, rr, 5, 'Không có trong danh sách BHXH cơ quan (File 2)',
             fill=YELLOW_ROW, font=normal(color="E65100", bold=True))
        ws_1.row_dimensions[rr].height = 17

# ========== SHEET 3: Chỉ có trong File 2 ==========
ws_2 = wb_out.create_sheet('Chi co trong File 2')
ws_2.merge_cells('A1:E1')
t2 = ws_2['A1']
t2.value = 'DANH SÁCH CHỈ CÓ TRONG FILE 2 (NHCS BHXH) – Không tìm thấy trong File 1 DS Nộp BH T7'
t2.font = Font(name='Times New Roman', bold=True, size=12, color="FFFFFF")
t2.fill = GREEN_FILL; t2.alignment = C
ws_2.row_dimensions[1].height = 28

for ci, h in enumerate(['STT', 'Họ và tên', 'Dòng trong File 2', 'Lương đóng BH (File 2)', 'Ghi chú'], 1):
    hdr(ws_2, 2, ci, h, fill=PatternFill("solid", fgColor="2E7D32"))
ws_2.row_dimensions[2].height = 32

ws_2.column_dimensions['A'].width = 6
ws_2.column_dimensions['B'].width = 30
ws_2.column_dimensions['C'].width = 18
ws_2.column_dimensions['D'].width = 22
ws_2.column_dimensions['E'].width = 45
ws_2.freeze_panes = 'A3'

for i, ten in enumerate(sorted(only_f2), 1):
    r = i + 2
    row_fill = GRAY_FILL if i % 2 == 0 else PatternFill("solid", fgColor="E8F5E9")
    recs = idx_f2[ten]
    for j, rec in enumerate(recs):
        rr = r + j
        cell(ws_2, rr, 1, i if j == 0 else '', fill=row_fill, align=C)
        cell(ws_2, rr, 2, ten, fill=row_fill)
        cell(ws_2, rr, 3, rec['row'], fill=row_fill, align=C)
        cell(ws_2, rr, 4, rec['luong'], fill=row_fill, align=R, fmt='#,##0')
        cell(ws_2, rr, 5, 'Không có trong Danh sách Nộp BH tháng 7 (File 1)',
             fill=PatternFill("solid", fgColor="C8E6C9"), font=normal(color="1B5E20", bold=True))
        ws_2.row_dimensions[rr].height = 17

out_path = r'd:\SP\KET_QUA_SO_SANH_BH_T8.xlsx'
wb_out.save(out_path)
print(f'Da xuat: {out_path}')
print(f'  Sheet 1 - Luong lech nhau:     {len(diff_list)} truong hop')
print(f'  Sheet 2 - Chi co trong File 1: {len(only_f1)} nguoi')
print(f'  Sheet 3 - Chi co trong File 2: {len(only_f2)} nguoi')
