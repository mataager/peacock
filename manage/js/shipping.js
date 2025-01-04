document.addEventListener("DOMContentLoaded", () => {
  fetchCompletedOrders();
});

async function fetchCompletedOrders() {
  const preloader = document.getElementById("preloader");
  const completedOrdersContent = document.getElementById(
    "completed-orders-content"
  );
  const completedOrdersTableBody = document.getElementById(
    "completed-orders-table-body"
  );

  let completedOrdersCount = 0;

  try {
    // Show the preloader
    preloader.classList.remove("hidden");

    const response = await fetch(`${url}/Stores/${uid}/orders.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    completedOrdersTableBody.innerHTML = ""; // Clear existing content

    if (!data) {
      console.log("No orders found.");
      checkAndDisplayEmptyMessage(
        "completed-orders-table-body",
        "completed-orders-content",
        "No completed orders yet."
      );
      return;
    }

    const reversedOrders = Object.entries(data).reverse();

    for (const [orderId, order] of reversedOrders) {
      if (order.progress === "accepted" || order.progress === "shipped") {
        completedOrdersCount++;

        const customerName = order.personal_info?.name || "N/A";
        const email = order.personal_info?.email || "N/A";
        const city = order.personal_info?.city || "N/A";
        const address = order.personal_info?.address || "N/A";
        const phoneNumber = order.personal_info?.phone || "N/A";
        const housenumber = order.personal_info?.phone2 || "N/A";
        const totalPrice =
          order.cart.reduce(
            (sum, item) =>
              sum + parseFloat(item.price.replace(" EGP", "")) * item.quantity,
            0
          ) + order.shippingFees;

        const row = document.createElement("tr");
        row.classList.add("point", "order-tr", "green-tr"); // Style for completed orders
        row.setAttribute("data-order-id", orderId);

        row.innerHTML = `
          <td>${orderId}</td>
          <td>${customerName}</td>
          <td class="w-300">${email}</td>
          <td>${city}</td>
          <td>
              <div class="flex center flex-start">
                  <div class="loc-order-ico m-LR-2" onclick="searchonmap('${address}', event)">
                      <i class="bi bi-geo-alt"></i>
                  </div>
                  <div class="loc-order-ico m-LR-2" onclick="copytoclipbarod('${address}', event)">
                      <i class="bi bi-copy"></i>
                  </div>
              </div>
          </td>
          <td>${phoneNumber}</td>
          <td>${housenumber}</td>
          <td>${order.shippingFees} EGP</td>
          <td>${totalPrice.toFixed(2)} EGP</td>
          <td class="flex center align items w-700">
          <div class="flex center align items inherit-color w-500">
              <button type="button" class="addbtn pointer open-order-btn p-7">
                  <p>Open Order</p><i class="bi bi-plus-circle point" data-order-id="${orderId}"></i>
              </button>
              <button type="button" class="addbtn pointer accept-order-btn p-7" onclick="print('${orderId}')">
                  <p>Print Order</p><i class="bi bi-printer"></i>
              </button>
              <button type="button" class="addbtn pointer out-for-shipping accept-order-btn p-7 " data-order-id="${orderId}" id="" >
                  <p>Mark As Shipped</p> <i class="bi bi-truck"></i>
              </button>
              <button type="button" class="addbtn pointer returned accept-order-btn p-7 " data-order-id="${orderId}" id="" >
                  <p>Mark As Returned</p> <i class="bi bi-arrow-counterclockwise"></i>
              </button>
              </div>
          </td>
        `;

        completedOrdersTableBody.appendChild(row);
      }
    }
    // Add click event listener to all rows
    document.querySelectorAll("tr.point").forEach((row) => {
      row.addEventListener("click", toggleOrderDetails);
    });

    if (completedOrdersCount === 0) {
      console.log("No completed orders.");
      checkAndDisplayEmptyMessage(
        "completed-orders-table-body",
        "completed-orders-content",
        "No completed orders yet."
      );
    }
  } catch (error) {
    console.error("Error fetching completed orders:", error);
  } finally {
    // Hide the preloader
    preloader.classList.add("hidden");
  }
}

async function toggleOrderDetails(event) {
  const row = event.currentTarget;
  const nextRow = row.nextElementSibling;

  // Check if the next row is already the details row
  if (nextRow && nextRow.classList.contains("order-details")) {
    // Collapse to hide cart items
    nextRow.remove();
  } else {
    // Add wave loading effect
    row.classList.add("wave-loading");

    const MIN_LOADING_TIME = 1000; // Minimum wave effect duration in milliseconds
    const startTime = Date.now();

    try {
      const orderId = row.getAttribute("data-order-id");
      const response = await fetch(
        `${url}/Stores/${uid}/orders/${orderId}.json`
      );
      const order = await response.json();

      if (!order || !order.cart) {
        console.error("Order or cart is null or undefined.");
        return;
      }

      const cartItems = order.cart
        .map(
          (item) => `  
            <tr class="cart-item">
              <td colspan="9">
                <div style="display: flex; align-items: center; width: max-content;">
                  <img src="${item.photourl}" alt="${item.title}" 
                       style="width: auto; height: 80px; margin-right: 10px;" 
                       class="clickable-image pointer">
                  <div style="display: flex; flex-direction: column; gap: 5px;">
                    <p>${item.id}</p>
                    <p>${item.brand}</p>
                    <p>${item.productColor}</p>
                    <p>${item.productSize}</p>
                    <p>Qty: ${item.quantity}</p>
                    <p>${
                      parseFloat(item.price.replace(" EGP", "")) * item.quantity
                    } EGP</p>
                  </div>
                </div>
              </td>
            </tr>`
        )
        .join("");

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

      // Wait for the remaining time before adding the details row
      await new Promise((resolve) => setTimeout(resolve, remainingTime));

      const detailsRow = document.createElement("tr");
      detailsRow.classList.add("order-details");
      detailsRow.innerHTML = `
        <td colspan="9">
          <table style="width: 100%;">
            <tbody class="flex flex-wrap">
              ${cartItems}
            </tbody>
          </table>
        </td>
      `;
      row.after(detailsRow);

      // Attach click event to images
      document.querySelectorAll(".clickable-image").forEach((img) => {
        img.addEventListener("click", openModal);
      });
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      // Remove the wave-loading effect after 2 seconds
      row.classList.remove("wave-loading");
    }
  }
}

// Modal handling functions
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");
const captionText = document.getElementById("caption");
const span = document.getElementsByClassName("close")[0];

function openModal(event) {
  event.stopPropagation(); // Prevent triggering row click event
  modal.style.display = "block";
  modalImg.src = event.target.src;
  captionText.innerHTML = event.target.alt;
}
