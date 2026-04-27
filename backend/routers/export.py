from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import csv
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from database import get_db
from auth import get_current_user
import models

router = APIRouter()


def _style_header(cell, bg_color: str = "6C63FF"):
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill(start_color=bg_color, end_color=bg_color, fill_type="solid")
    cell.alignment = Alignment(horizontal="center", vertical="center")


def _auto_width(ws):
    for col in ws.columns:
        max_len = max((len(str(cell.value or "")) for cell in col), default=8)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 45)


@router.get("")
def export_data(
    format: str = "excel",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    orders = (
        db.query(models.PurchaseOrder)
        .filter(
            models.PurchaseOrder.user_id == current_user.id,
            models.PurchaseOrder.status != "deleted",
        )
        .order_by(models.PurchaseOrder.created_at.desc())
        .all()
    )

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "PO Number", "Supplier", "Brand", "Buyer", "Category",
            "Total Value USD", "Total Value GBP", "Exchange Rate", "Status", "Created At",
        ])
        for po in orders:
            writer.writerow([
                po.po_number, po.supplier, po.brand, po.buyer, po.category,
                po.total_value_usd, po.total_value_gbp, po.exchange_rate,
                po.status, po.created_at.isoformat() if po.created_at else "",
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=purchase_orders.csv"},
        )

    # Excel export
    wb = Workbook()
    ws_orders = wb.active
    ws_orders.title = "Orders"

    orders_headers = [
        "PO Number", "Supplier", "Brand", "Buyer", "Category",
        "Total Value USD", "Total Value GBP", "Exchange Rate", "Status", "Created At",
    ]
    for col, header in enumerate(orders_headers, 1):
        cell = ws_orders.cell(row=1, column=col, value=header)
        _style_header(cell)

    for row_idx, po in enumerate(orders, 2):
        ws_orders.cell(row=row_idx, column=1, value=po.po_number)
        ws_orders.cell(row=row_idx, column=2, value=po.supplier)
        ws_orders.cell(row=row_idx, column=3, value=po.brand)
        ws_orders.cell(row=row_idx, column=4, value=po.buyer)
        ws_orders.cell(row=row_idx, column=5, value=po.category)
        ws_orders.cell(row=row_idx, column=6, value=po.total_value_usd)
        ws_orders.cell(row=row_idx, column=7, value=po.total_value_gbp)
        ws_orders.cell(row=row_idx, column=8, value=po.exchange_rate)
        ws_orders.cell(row=row_idx, column=9, value=po.status)
        ws_orders.cell(
            row=row_idx, column=10,
            value=po.created_at.isoformat() if po.created_at else "",
        )

    _auto_width(ws_orders)

    ws_items = wb.create_sheet("Line Items")
    items_headers = [
        "PO Number", "Style Number", "Order Quantity", "Unit Price",
        "Line Total USD", "Confirmed Delivery", "Actual Delivery",
    ]
    for col, header in enumerate(items_headers, 1):
        cell = ws_items.cell(row=1, column=col, value=header)
        _style_header(cell)

    row_idx = 2
    for po in orders:
        for item in po.line_items:
            line_total = round((item.order_quantity or 0) * (item.unit_price or 0.0), 2)
            ws_items.cell(row=row_idx, column=1, value=po.po_number)
            ws_items.cell(row=row_idx, column=2, value=item.style_number)
            ws_items.cell(row=row_idx, column=3, value=item.order_quantity)
            ws_items.cell(row=row_idx, column=4, value=item.unit_price)
            ws_items.cell(row=row_idx, column=5, value=line_total)
            ws_items.cell(
                row=row_idx, column=6,
                value=item.delivery_date_confirmed.isoformat() if item.delivery_date_confirmed else "",
            )
            ws_items.cell(
                row=row_idx, column=7,
                value=item.delivery_date_actual.isoformat() if item.delivery_date_actual else "",
            )
            row_idx += 1

    _auto_width(ws_items)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=purchase_orders.xlsx"},
    )
