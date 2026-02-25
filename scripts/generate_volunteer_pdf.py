"""
Generate a compact 1-2 page volunteer instructions PDF with QR code.
Usage: python scripts/generate_volunteer_pdf.py
"""

import os
import sys
import io
import tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from fpdf import FPDF
import qrcode

OUTPUT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "Volunteer_Guide.pdf")
)

SITE_URL = "https://samdaltonjr.github.io/big_sign_mapper/"

# Colors
BLUE = (37, 99, 235)
RED = (220, 38, 38)
PURPLE = (147, 51, 234)
DARK = (30, 30, 30)
GRAY = (100, 100, 100)
LIGHT_BG = (240, 242, 248)
WHITE = (255, 255, 255)


def generate_qr(url: str) -> str:
    """Generate a QR code PNG and return the temp file path."""
    qr = qrcode.QRCode(version=1, box_size=12, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    path = os.path.join(tempfile.gettempdir(), "bigsign_qr.png")
    img.save(path)
    return path


class PDF(FPDF):
    def footer(self):
        self.set_y(-10)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*GRAY)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="C")

    def section(self, title):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*BLUE)
        self.cell(0, 6, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*BLUE)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)

    def body(self, text):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*DARK)
        self.multi_cell(0, 4.5, text)
        self.ln(0.5)

    def bullet(self, text, bold_prefix=""):
        y = self.get_y()
        self.set_fill_color(*DARK)
        self.ellipse(self.get_x() + 1.5, y + 1.5, 2, 2, style="F")
        self.cell(6, 4.5, "")
        if bold_prefix:
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*DARK)
            self.write(4.5, bold_prefix + " ")
            self.set_font("Helvetica", "", 9)
            self.write(4.5, text)
            self.ln(5)
        else:
            self.set_font("Helvetica", "", 9)
            self.set_text_color(*DARK)
            self.multi_cell(0, 4.5, text)
            self.ln(0.5)

    def step(self, num, title, desc):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*BLUE)
        self.cell(5, 4.5, f"{num}.")
        self.set_text_color(*DARK)
        self.cell(0, 4.5, title, new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 8.5)
        self.set_x(self.l_margin + 5)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 5, 4, desc)
        self.ln(0.5)


def build_pdf():
    qr_path = generate_qr(SITE_URL)

    pdf = PDF(orientation="P", unit="mm", format="letter")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.set_margins(15, 10, 15)
    pdf.add_page()

    # ===== HEADER with QR code =====
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*BLUE)
    pdf.cell(0, 10, "Big Sign Mapper", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 5, "Volunteer Quick-Start Guide", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    # QR code in top-right corner
    qr_size = 28
    pdf.image(qr_path, x=pdf.w - pdf.r_margin - qr_size, y=10, w=qr_size)
    pdf.set_font("Helvetica", "", 6.5)
    pdf.set_text_color(*GRAY)
    qr_label_w = qr_size + 2
    pdf.set_xy(pdf.w - pdf.r_margin - qr_size - 1, 10 + qr_size)
    pdf.cell(qr_label_w, 4, "Scan to open site", align="C")

    pdf.set_y(28)

    # ===== WHAT YOU NEED =====
    pdf.section("What You Need")
    pdf.bullet("A smartphone with a camera and internet access")
    pdf.bullet("The access code from your team lead")

    # ===== HOW TO SUBMIT =====
    pdf.section("How to Submit a Sign Placement")
    pdf.body(
        "Open the site (scan QR code above or visit the URL below), tap Submit, "
        "and enter the access code. Then follow these steps:"
    )

    pdf.step(1, "Enter your name", "So the team knows who placed the sign.")
    pdf.step(2, "Set the location",
        "Use My Current Location (best when you're at the sign), "
        "search by address, or drop a pin on the map.")
    pdf.step(3, "Upload a photo",
        "Tap to take a photo or choose one from your gallery. It compresses automatically.")
    pdf.step(4, "Add notes (optional)",
        'E.g. "Property owner gave permission" or "High visibility corner."')
    pdf.step(5, "Tap Submit",
        "Your sign appears on the map immediately. Tap Submit Another for the next one.")

    # ===== READING THE MAP =====
    pdf.section("Reading the Map")

    # Compact color legend
    legend_items = [
        (BLUE,   "Blue",   "Big Signs (your placements)"),
        (RED,    "Red",    "Early Voting (sized S/M/L by turnout)"),
        (PURPLE, "Purple", "Election Day (Dem Primary)"),
    ]
    for color, label, desc in legend_items:
        y = pdf.get_y()
        pdf.set_fill_color(*color)
        pdf.ellipse(pdf.l_margin + 2, y + 1, 4, 4, style="F")
        pdf.set_x(pdf.l_margin + 9)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*DARK)
        pdf.write(4.5, f"{label} = ")
        pdf.set_font("Helvetica", "", 9)
        pdf.write(4.5, desc)
        pdf.ln(5.5)

    pdf.ln(1)
    pdf.body(
        "Use the checkboxes (top-right) to filter marker types. "
        "Numbered clusters expand when you zoom in. "
        "Tap any marker to see its name, address, and photo."
    )

    # ===== WHERE TO PLACE SIGNS =====
    pdf.section("Where to Place Signs (Priority Order)")
    pdf.bullet("Near large red dots (Tier 1 early voting sites, 300+ Dem ballots).",
               "Highest impact:")
    pdf.bullet("Near any red or purple dots (all polling locations).",
               "High impact:")
    pdf.bullet("High-traffic intersections, major roads, neighborhood entrances.",
               "Good visibility:")
    pdf.ln(1)

    # ===== PLACEMENT TIPS =====
    pdf.section("Placement Tips")
    pdf.bullet("Face the sign toward traffic. Push stakes fully into the ground.")
    pdf.bullet("Place on public right-of-way or private property with permission.")
    pdf.bullet("Don't block sidewalks, driveways, or intersection sight lines.")
    pdf.bullet("Avoid utility poles, traffic signs, and government property.")

    # ===== TROUBLESHOOTING =====
    pdf.section("Troubleshooting")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*DARK)
    troubles = [
        ("Invalid access code?", "Check with your team lead - it's case-sensitive."),
        ("GPS not working?", "Enable location services, or use address search / pin drop."),
        ("Photo won't upload?", "Try taking a new photo directly from the form."),
        ("Sign not on map?", "Refresh the page. If still missing, re-submit."),
    ]
    for prob, sol in troubles:
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.write(4.5, prob + " ")
        pdf.set_font("Helvetica", "", 8.5)
        pdf.write(4.5, sol)
        pdf.ln(5)

    # ===== FOOTER BOX =====
    pdf.ln(3)
    y_box = pdf.get_y()
    box_w = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.set_fill_color(*LIGHT_BG)
    pdf.set_draw_color(*BLUE)
    pdf.set_line_width(0.5)
    pdf.rect(pdf.l_margin, y_box, box_w, 22, style="DF")

    pdf.set_xy(pdf.l_margin + 4, y_box + 2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*BLUE)
    pdf.cell(0, 5, "Quick Steps:", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(pdf.l_margin + 4)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 4.5,
        "1) Scan QR code or go to samdaltonjr.github.io/big_sign_mapper   "
        "2) Tap Submit   3) Enter access code   "
        "4) Name + Location + Photo   5) Submit!",
        new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(pdf.l_margin + 4)
    pdf.ln(1)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 4, "Questions? Contact your team lead for the access code or help.")

    # Save
    pdf.output(OUTPUT)
    print(f"PDF saved to: {OUTPUT}")
    print(f"Pages: {pdf.page_no()}")

    # Cleanup QR temp file
    try:
        os.remove(qr_path)
    except OSError:
        pass


if __name__ == "__main__":
    build_pdf()
