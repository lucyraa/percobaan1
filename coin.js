// =======================
// INISIALISASI DATA AWAL
// =======================
if (!localStorage.getItem("coins")) {
    localStorage.setItem("coins", "6000");
}
if (!localStorage.getItem("koleksiItem")) {
    localStorage.setItem("koleksiItem", JSON.stringify({}));
}
if (!localStorage.getItem("itemTerpasang")) {
    localStorage.setItem("itemTerpasang", JSON.stringify({}));
}

let coins = parseInt(localStorage.getItem("coins")) || 0;

// ============================
// INTERFACE LEDGER ICP
// ============================
const ledgerIDL = ({ IDL }) => {
  return IDL.Service({
    account_balance_dfx: IDL.Func(
      [
        {
          account: IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
          }),
        },
      ],
      [IDL.Record({ e8s: IDL.Nat64 })],
      ["query"]
    ),
  });
};

// ============================
// FUNGSI CEK SALDO ICP
// ============================
async function getICPSaldo() {
  try {
    const principal = await window.ic.plug.getPrincipal();

    const ledger = await window.ic.plug.createActor({
      canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      interfaceFactory: ledgerIDL(window.ic.plug.IDL),
    });

    const result = await ledger.account_balance_dfx({
      account: {
        owner: principal,
        subaccount: [],
      },
    });

    return Number(result.e8s) / 100_000_000;
  } catch (err) {
    console.error("Gagal cek saldo ICP:", err);
    return 0;
  }
}

// ============================
// FUNGSI LOADING
// ============================
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex', 'flex-col');
    }
}
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex', 'flex-col');
    }
}

// ============================
// CONNECT PLUG WALLET
// ============================
async function handleConnection() {
    const btn = document.getElementById("connectBtn");
    if (!window.ic || !window.ic.plug) {
        alert("Plug Wallet tidak ditemukan.");
        window.open('https://plugwallet.ooo/', '_blank');
        return;
    }
    btn.disabled = true;
    showLoading("Menghubungkan ke Wallet...");
    try {
        await window.ic.plug.requestConnect({
            whitelist: [],
            host: "https://icp0.io",
        });

        if (await window.ic.plug.isConnected()) {
            const principalId = await window.ic.plug.getPrincipal();
            sessionStorage.setItem('plugConnected', 'true');
            sessionStorage.setItem('principalId', principalId.toText());
            window.location.href = 'shop.html';
        } else {
            throw new Error("Koneksi tidak berhasil diverifikasi.");
        }
    } catch (error) {
        alert("Koneksi gagal: " + error.message);
    } finally {
        hideLoading();
        btn.disabled = false;
    }
}

// ============================
// FUNGSI TOP UP
// ============================
async function topUp(amount) {
    const ALAMAT_PENERIMA = 'etxmz-m6pfj-ols34-3oatd-obisr-ywiok-6dssr-gf5jo-5ln6f-rak52-iae';
    closeTopUpModal();
    showLoading("Memverifikasi koneksi wallet...");
    try {
        if (!(await window.ic.plug.isConnected())) {
            await window.ic.plug.requestConnect({ whitelist: [] });
        }

        const saldo = await getICPSaldo();
        const priceInICP = amount * 0.001;

        if (saldo < priceInICP) {
            hideLoading();
            alert("❌ Saldo ICP tidak cukup untuk top up.");
            return;
        }

        const priceInE8s = BigInt(Math.floor(priceInICP * 100_000_000)).toString();

        showLoading("Menunggu persetujuan di Plug Wallet...");
        const result = await window.ic.plug.requestTransfer({
            to: ALAMAT_PENERIMA,
            amount: priceInE8s,
        });

        if (result && result.height) {
            coins += amount;
            localStorage.setItem("coins", String(coins));
            updateCoinDisplay();
            hideLoading();
            alert(`🎉 Berhasil! Kamu mendapatkan ${amount} coin.`);
        } else {
            throw new Error("Transaksi dibatalkan atau gagal.");
        }
    } catch (err) {
        console.error("Top up gagal:", err);
        hideLoading();
        alert(`❌ Top up gagal: ${err.message}`);
    }
}

// ============================
// MODAL & UI COIN
// ============================
function updateCoinDisplay() {
    const coinSpan = document.getElementById("coinDisplay");
    if (coinSpan) {
        coinSpan.textContent = coins.toLocaleString("id-ID");
    }
}
function showTopUpModal() {
    const modal = document.getElementById("topUpModal");
    if (modal) modal.classList.remove('hidden');
}
function closeTopUpModal() {
    const modal = document.getElementById("topUpModal");
    if (modal) modal.classList.add('hidden');
}

// ============================
// TOMBOL WALLET
// ============================
function initializeWalletButton() {
    const walletBtn = document.getElementById('walletBtn');
    const isConnected = sessionStorage.getItem('plugConnected') === 'true';
    if (!walletBtn) return;

    if (isConnected) {
        walletBtn.textContent = "Top Up";
        walletBtn.onclick = showTopUpModal;
    } else {
        walletBtn.textContent = "Connect Wallet";
        walletBtn.onclick = () => window.location.href = 'index.html';
    }
}

// ============================
// LOAD SAAT PAGE DIBUKA
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname;
    if (sessionStorage.getItem('plugConnected') !== 'true' && !currentPage.includes('index.html')) {
        window.location.href = 'index.html';
        return;
    }
    updateCoinDisplay();
    initializeWalletButton();
});

// ============================
// FUNGSI PASANG ITEM (KOLEKSI)
// ============================
function pakaiItem(namaItem, tipe) {
    let itemTerpasang = JSON.parse(localStorage.getItem("itemTerpasang")) || {};
    itemTerpasang[tipe] = namaItem;
    localStorage.setItem("itemTerpasang", JSON.stringify(itemTerpasang));
}
