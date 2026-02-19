import os
import random
import csv
import json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from faker import Faker

fake = Faker()
OUTPUT_DIR = "dataset/receipts"
METADATA_FILE = "dataset/metadata.csv"

os.makedirs(f"{OUTPUT_DIR}/safe", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/fraud", exist_ok=True)

def create_receipt_image(filename, label, fraud_type=None):
    width, height = 600, 800
    color = "white"
    if random.random() < 0.2:
        color = "#f8f9fa" # Slight off-white
    
    img = Image.new('RGB', (width, height), color)
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("arial.ttf", 16)
        font_bold = ImageFont.truetype("arialbd.ttf", 20)
        font_title = ImageFont.truetype("arialbd.ttf", 24)
    except:
        font = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_title = ImageFont.load_default()

    # Vendor Info
    vendor_name = fake.company()
    draw.text((20, 20), vendor_name, font=font_title, fill="black")
    draw.text((20, 50), fake.address().replace("\n", ", "), font=font, fill="gray")
    
    # Invoice Details
    inv_no = f"INV-{random.randint(1000, 9999)}"
    date = fake.date_this_year().strftime("%d-%m-%Y")
    draw.text((400, 20), f"Invoice: {inv_no}", font=font, fill="black")
    draw.text((400, 45), f"Date: {date}", font=font, fill="black")
    
    draw.line((20, 90, 580, 90), fill="black", width=2)
    
    # Items
    y = 120
    total = 0
    items = []
    for _ in range(random.randint(2, 5)):
        item_name = fake.word().capitalize() + " " + fake.word().capitalize()
        price = random.randint(1000, 50000)
        items.append((item_name, price))
        total += price
        draw.text((20, y), item_name, font=font, fill="black")
        draw.text((500, y), f"{price:,}", font=font, fill="black", align="right")
        y += 30
    
    draw.line((20, y+10, 580, y+10), fill="black", width=1)
    y += 30
    
    # Validation / Fraud Logic
    display_total = total
    gst_rate = 0.18
    gst_amt = int(total * gst_rate)
    
    # Fraud Type: Amount Tampering
    if fraud_type == "amount_mismatch":
        display_total = int(total * 1.5) # Inflated
    
    # GST
    gst_str = f"27{fake.bothify('?????')}1Z5" # Valid-ish format
    if fraud_type == "invalid_gst":
         gst_str = "INVALID-GST-NUMBER"

    draw.text((350, y), f"Subtotal: {total:,}", font=font, fill="black")
    y += 25
    draw.text((350, y), f"GST (18%): {gst_amt:,}", font=font, fill="black")
    draw.text((20, y), f"GSTIN: {gst_str}", font=font, fill="gray")
    y += 25
    
    final_total = display_total + gst_amt
    
    # Visual Tampering (different background for total)
    if fraud_type == "tampered_total":
        draw.rectangle((340, y-5, 590, y+30), fill="#eeeeee") # Paste mark
        final_total += 50000 # Blatant edit

    draw.text((350, y), f"TOTAL: {final_total:,}", font=font_bold, fill="black")
    
    # Signature
    y_sig = height - 150
    if fraud_type != "missing_signature":
        # Draw signature
        sig_color = "blue" if random.random() > 0.5 else "black"
        
        # Simple squiggle
        points = []
        cx, cy = 100, y_sig + 50
        for i in range(20):
             points.append((cx + i*5 + random.randint(-5, 5), cy + random.randint(-10, 10)))
        
        if fraud_type == "forged_overlay":
             # Perfect black, smooth line
             draw.line(points, fill="black", width=2)
        else:
             # Natural
             draw.line(points, fill=sig_color, width=3)
             
        draw.text((50, y_sig + 80), "Authorized Signatory", font=font, fill="black")
        
        if fraud_type == "blurred_signature":
             # Blur the signature region
             box = (50, y_sig, 250, y_sig + 100)
             ic = img.crop(box)
             ic = ic.filter(ImageFilter.GaussianBlur(10))
             img.paste(ic, box)

    # Save
    path = f"{OUTPUT_DIR}/{label}/{filename}"
    img.save(path)
    
    # Metadata
    return {
        "filename": filename,
        "label": label,
        "fraud_type": fraud_type,
        "total_amount": final_total,
        "gst_valid": fraud_type != "invalid_gst",
        "signature_present": fraud_type != "missing_signature",
        "signature_blurred": fraud_type == "blurred_signature"
    }

def generate_dataset(count=100):
    metadata = []
    
    for i in range(count):
        # Safe
        metadata.append(create_receipt_image(f"safe_{i}.png", "safe", None))
        
        # Frauds
        ftypes = ["missing_signature", "blurred_signature", "amount_mismatch", "invalid_gst", "tampered_total", "forged_overlay"]
        ftype = random.choice(ftypes)
        metadata.append(create_receipt_image(f"fraud_{i}.png", "fraud", ftype))
        
    # Save CSV
    with open(METADATA_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=metadata[0].keys())
        writer.writeheader()
        writer.writerows(metadata)
        
    print(f"Generated {len(metadata)} images in {OUTPUT_DIR}")

if __name__ == "__main__":
    generate_dataset(200) # 200 of each category basically (loop runs 200 times approx, producing 2 images per loop)
