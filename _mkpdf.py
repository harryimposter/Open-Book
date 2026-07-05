import re, io
from xhtml2pdf import pisa
html = io.open("MAPPING_AND_TAGGING.html", encoding="utf-8").read()
with open("MAPPING_AND_TAGGING.pdf","wb") as f:
    res = pisa.CreatePDF(html, dest=f, encoding="utf-8")
print("ERR" if res.err else "OK")
