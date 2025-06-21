// Configuration
const API_BASE_URL = 'https://sekalipay.com/api/v1';
const API_KEY = 'YZVra5zevtPGJJP5VzKe0dVfbFGFJaEP'; // Replace with your API key

// DOM Elements
const balanceAmountEl = document.getElementById('balance-amount');
const productListEl = document.getElementById('product-list');
const productSpinnerEl = document.getElementById('product-spinner');
const monthlyLeaderboardEl = document.getElementById('monthly-leaderboard');
const weeklyLeaderboardEl = document.getElementById('weekly-leaderboard');
const transactionListEl = document.getElementById('transaction-list');
const transactionPaginationEl = document.getElementById('transaction-pagination');
const topupFormEl = document.getElementById('topup-form');
const topupSpinnerEl = document.getElementById('topup-spinner');

// Current page state
let currentTransactionPage = 1;
const transactionsPerPage = 5;

/* ======================
   UTILITY FUNCTIONS
   ====================== */

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '1100';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
}

/* ======================
   API FUNCTIONS
   ====================== */

async function fetchApiData(endpoint, method = 'GET', body = null) {
    try {
        const headers = {
            'Accept': 'application/json',
            'X-API-KEY': API_KEY
        };
        
        if (method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }
        
        const options = {
            method,
            headers
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showAlert('danger', `Error: ${error.message}`);
        return null;
    }
}

/* ======================
   DATA LOADING FUNCTIONS
   ====================== */

async function loadBalance() {
    const data = await fetchApiData('balance');
    
    if (data && data.data) {
        balanceAmountEl.textContent = data.data.balance.toLocaleString('id-ID');
    }
}

async function loadProducts() {
    productSpinnerEl.style.display = 'block';
    productListEl.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Memuat produk...</p>
        </div>
    `;
    
    const data = await fetchApiData('item');
    productSpinnerEl.style.display = 'none';
    
    if (data && data.data) {
        if (data.data.length === 0) {
            productListEl.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-box-seam display-5 text-muted"></i>
                    <p class="mt-3">Tidak ada produk tersedia</p>
                </div>
            `;
            return;
        }
        
        productListEl.innerHTML = data.data.map(product => `
            <div class="col-md-4 col-sm-6">
                <div class="card h-100">
                    <img src="https://via.placeholder.com/300x150?text=${encodeURIComponent(product.name)}" class="product-img card-img-top" alt="${product.name}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.description || 'Deskripsi tidak tersedia'}</p>
                        <div class="mt-auto">
                            <p class="h5 text-primary mb-3">${formatCurrency(product.price)}</p>
                            <button class="btn btn-primary w-100 buy-btn" data-product-id="${product.id}">
                                <i class="bi bi-cart-plus me-1"></i>Beli
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to buy buttons
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                showAlert('info', `Fitur pembelian produk ${productId} akan diimplementasikan`);
            });
        });
    }
}

async function loadLeaderboard() {
    const [monthlyData, weeklyData] = await Promise.all([
        fetchApiData('leaderboard?type=monthly'),
        fetchApiData('leaderboard?type=weekly')
    ]);
    
    if (monthlyData && monthlyData.data) {
        monthlyLeaderboardEl.innerHTML = monthlyData.data.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.buyer_name}</td>
                <td>${formatCurrency(parseInt(user.total_spent))}</td>
            </tr>
        `).join('');
    }
    
    if (weeklyData && weeklyData.data) {
        weeklyLeaderboardEl.innerHTML = weeklyData.data.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.buyer_name}</td>
                <td>${formatCurrency(parseInt(user.total_spent))}</td>
            </tr>
        `).join('');
    }
}

async function loadUserRank() {
    const data = await fetchApiData('leaderboard/profile');
    
    if (data && data.data) {
        const rank = data.data.ranked;
        if (rank > 0) {
            showAlert('success', `Peringkat Anda: #${rank}`);
        }
    }
}

async function loadTransactions(page = 1) {
    currentTransactionPage = page;
    const data = await fetchApiData(`trx?page=${page}&per_page=${transactionsPerPage}`);
    
    if (data && data.data) {
        // Update transactions list
        transactionListEl.innerHTML = data.data.transactions.map(trx => `
            <tr>
                <td>${trx.id}</td>
                <td>${formatDate(trx.created_at)}</td>
                <td>${trx.items.join(', ')}</td>
                <td>${formatCurrency(trx.amount)}</td>
                <td>
                    <span class="badge bg-${trx.status === 'success' ? 'success' : 'warning'}">
                        ${trx.status === 'success' ? 'Berhasil' : 'Pending'}
                    </span>
                </td>
            </tr>
        `).join('');
        
        // Update pagination
        const totalPages = Math.ceil(data.data.pagination.total / transactionsPerPage);
        transactionPaginationEl.innerHTML = '';
        
        // Previous button
        transactionPaginationEl.innerHTML += `
            <li class="page-item ${page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="loadTransactions(${page - 1})">&laquo;</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            transactionPaginationEl.innerHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="loadTransactions(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        transactionPaginationEl.innerHTML += `
            <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="loadTransactions(${page + 1})">&raquo;</a>
            </li>
        `;
    }
}

/* ======================
   EVENT HANDLERS
   ====================== */

function handleTopupSubmit(e) {
    e.preventDefault();
    
    const amount = parseInt(document.getElementById('topup-amount').value);
    const method = document.getElementById('payment-method').value;
    
    // Validation
    if (amount < 10000 || amount > 10000000) {
        showAlert('danger', 'Jumlah top up harus antara Rp 10.000 - Rp 10.000.000');
        return;
    }
    
    if (!method) {
        showAlert('danger', 'Silakan pilih metode pembayaran');
        return;
    }
    
    // Show loading spinner
    topupSpinnerEl.classList.remove('d-none');
    document.getElementById('topup-submit').disabled = true;
    
    try {
        const response = await fetchApiData('balance', 'POST', {
            ref_id: 'ref_' + Date.now(),
            code: method,
            amount: amount
        });
        
        if (response) {
            showAlert('success', 'Top up berhasil! Saldo akan segera diperbarui');
            loadBalance();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('topupModal'));
            modal.hide();
            
            // Reset form
            topupFormEl.reset();
        }
    } finally {
        // Hide loading spinner
        topupSpinnerEl.classList.add('d-none');
        document.getElementById('topup-submit').disabled = false;
    }
}

/* ======================
   INITIALIZATION
   ====================== */

async function initApp() {
    // Load all data
    await Promise.all([
        loadBalance(),
        loadProducts(),
        loadLeaderboard(),
        loadUserRank(),
        loadTransactions()
    ]);
    
    // Show welcome message
    setTimeout(() => {
        showAlert('info', 'Selamat datang di SekaliPay!');
    }, 1000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    topupFormEl.addEventListener('submit', handleTopupSubmit);
});

// Make loadTransactions available globally for pagination
window.loadTransactions = loadTransactions;
