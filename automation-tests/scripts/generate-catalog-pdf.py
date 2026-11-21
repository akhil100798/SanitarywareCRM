import sys
import os
from datetime import datetime

def create_pdf(filename, lines):
    content_stream = "BT /F1 12 Tf 50 750 Td "
    for i, line in enumerate(lines):
        if i > 0:
            content_stream += "0 -20 Td "
        safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_stream += f"({safe_line}) Tj "
    content_stream += "ET"
    
    stream_len = len(content_stream.encode("latin1"))
    
    objs = []
    # 1: Catalog
    objs.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
    # 2: Pages
    objs.append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj")
    # 3: Page
    objs.append("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj")
    # 4: Contents
    objs.append(f"4 0 obj\n<< /Length {stream_len} >>\nstream\n{content_stream}\nendstream\nendobj")
    # 5: Font
    objs.append("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj")
    
    header = "%PDF-1.4\n"
    body = ""
    xref = ["xref\n0 6\n0000000000 65535 f \n"]
    offset = len(header.encode("latin1"))
    
    for obj in objs:
        xref.append(f"{offset:010d} 00000 n \n")
        body += obj + "\n"
        offset += len(obj.encode("latin1")) + 1
        
    xref_str = "".join(xref)
    trailer = f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{offset}\n%%EOF\n"
    
    with open(filename, "wb") as f:
        f.write((header + body + xref_str + trailer).encode("latin1"))
    print(f"Generated PDF: {filename} ({os.path.getsize(filename)} bytes)")

if __name__ == "__main__":
    suffix = sys.argv[1] if len(sys.argv) > 1 else ""
    
    sku1 = f"E8306{suffix}" if suffix else "E8306"
    sku2 = f"T9830{suffix}" if suffix else "T9830A1"
    sku3 = f"K1020{suffix}" if suffix else "K1020B2"

    # 1. Valid sanitaryware catalog
    create_pdf("valid_sanitaryware_catalog.pdf", [
        f"{sku1} Solid Plus Regular Seat Cover HSN Code:691010 Material:Ceramic Material Code:MC12 Item Code:IT12 t6,650",
        f"{sku2} Extension Nipple Chrome HSN Code:741820 Material:Brass Material Code:BR01 Item Code:IT98 t2,500",
        f"{sku3} Wall Hung Ceramic Basin HSN Code:691010 Material:Vitreous Material Code:VC22 Item Code:IT45 t14,800"
    ])
    # 2. Corrupt / invalid pricing catalog
    create_pdf("invalid_pricing_catalog.pdf", [
        "BROKEN123 Invalid Fixture With No Price Format",
        "BROKEN456 Corrupted Item Price t99,xx"
    ])
