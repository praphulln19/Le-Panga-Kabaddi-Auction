let players = [];
const kabaddiTeams = [
  { name: "BW", fullName: "Bengal Warriors", color: "#FF6600", icon: "🐅" },
  { name: "TT", fullName: "Tamil Thalaivas", color: "#800080", icon: "👑" },
  { name: "BB", fullName: "Bengaluru Bulls", color: "#DC143C", icon: "🐂" },
  { name: "HS", fullName: "Haryana Steelers", color: "#1E90FF", icon: "⚡" },
  { name: "PP", fullName: "Patna Pirates", color: "#FF6B35", icon: "🏴‍☠️" },
  { name: "DD", fullName: "Dabang Delhi", color: "#3F7CAC", icon: "🛡️" }
];

// Auction system state
let currentIndex = 0;
let teamValues = [];
let pointsValues = [];
let teamBudgets = {};
let auctionState = {
  isAuctionActive: false,
  currentPlayer: null,
  currentBid: 0,
  basePrice: 0,
  highestBidder: null
};

// Initialize team budgets and player counts
kabaddiTeams.forEach(team => {
  teamBudgets[team.name] = 10000;
});

// Track player counts per team
let teamPlayerCounts = {};
kabaddiTeams.forEach(team => {
  teamPlayerCounts[team.name] = 0;
});

// Maximum players per team
const MAX_PLAYERS_PER_TEAM = 8;

const mainView = document.getElementById("mainView");
const detailedNav = document.getElementById("detailedNav");
const dashboardView = document.getElementById("dashboardView");
const loadingOverlay = document.getElementById("loadingOverlay");

// Auction system functions
function startAuction(playerIndex) {
  if (auctionState.isAuctionActive) {
    showToast("Another auction is already in progress!", "warning");
    return;
  }

  const player = players[playerIndex];
  if (!player) return;

  // Check if player is already sold
  if (teamValues[playerIndex] && pointsValues[playerIndex]) {
    showToast("This player has already been sold!", "warning");
    return;
  }

  auctionState.isAuctionActive = true;
  auctionState.currentPlayer = playerIndex;
  auctionState.currentBid = auctionState.basePrice;
  auctionState.highestBidder = null;

  // Update auction status
  updateAuctionStatusDisplay();
  
  // Save state when auction starts
  saveAuctionState();
  
  showAuctionModal(player, playerIndex);
  
  // Broadcast auction start
  showToast(`🔥 AUCTION STARTED for ${player.Name}!`, "info");
}

function endAuction() {
  const playerIndex = auctionState.currentPlayer;
  const player = players[playerIndex];
  
  if (auctionState.highestBidder && auctionState.currentBid > 0) {
    // Player sold
    teamValues[playerIndex] = auctionState.highestBidder;
    pointsValues[playerIndex] = auctionState.currentBid;
    teamBudgets[auctionState.highestBidder] -= auctionState.currentBid;
    
    showToast(`🎉 ${player.Name} SOLD to ${auctionState.highestBidder} for ₹${auctionState.currentBid.toLocaleString()}!`, "success");
    
    // Update team display with celebration effect
    celebrateTeamPurchase(auctionState.highestBidder);
  } else {
    // Player unsold
    teamValues[playerIndex] = "";
    pointsValues[playerIndex] = 0;
    showToast(`❌ ${player.Name} UNSOLD`, "warning");
  }

  // Reset auction state
  auctionState.isAuctionActive = false;
  auctionState.currentPlayer = null;
  auctionState.currentBid = 0;
  auctionState.highestBidder = null;

  // Save state after auction ends
  saveAuctionState();
  
  closeAuctionModal();
  updateTeamBudgetDisplay();
  updateAuctionStatusDisplay();
  renderCurrentView();
}

function placeBid(teamName, bidAmount) {
  if (!auctionState.isAuctionActive) {
    showToast("No auction is currently active!", "error");
    return;
  }
  
  const team = kabaddiTeams.find(t => t.name === teamName);
  if (!team) return;

  // Check if team has reached maximum players
  if (!canTeamBuyPlayer(teamName)) {
    showToast(`${teamName} already has ${MAX_PLAYERS_PER_TEAM} players! Cannot buy more.`, "error");
    return;
  }

  // Validate bid amount
  if (teamBudgets[teamName] < bidAmount) {
    showToast(`${teamName} doesn't have enough budget! Available: ₹${teamBudgets[teamName].toLocaleString()}`, "error");
    return;
  }

  if (bidAmount <= auctionState.currentBid) {
    showToast("Bid must be higher than current bid!", "error");
    return;
  }

  // Place the bid
  auctionState.currentBid = bidAmount;
  auctionState.highestBidder = teamName;

  updateAuctionDisplay();
  updateAuctionStatusDisplay();
  
  // Show bid notification with team colors
  showToast(`💰 ${teamName} bids ₹${bidAmount.toLocaleString()}!`, "info");
  
  // Add visual feedback for the bidding team
  highlightBiddingTeam(teamName);
  
  // Save state after bid
  saveAuctionState();
}

function updateAuctionDisplay() {
  const currentBidElement = document.getElementById("currentBid");
  const highestBidderElement = document.getElementById("highestBidder");
  
  if (currentBidElement) {
    currentBidElement.textContent = auctionState.currentBid > 0 ? `₹${auctionState.currentBid.toLocaleString()}` : "No bids yet";
  }
  
  if (highestBidderElement) {
    if (auctionState.highestBidder) {
      const team = kabaddiTeams.find(t => t.name === auctionState.highestBidder);
      highestBidderElement.innerHTML = `<span class="team-icon">${team.icon}</span> ${team.fullName}`;
      highestBidderElement.style.color = team.color;
    } else {
      highestBidderElement.textContent = "No bidder";
      highestBidderElement.style.color = "#666";
    }
  }

  // Update bid buttons in modal
  updateBidButtons();
}

function updateBidButtons() {
  // Update all bid inputs and buttons
  kabaddiTeams.forEach(team => {
    const input = document.getElementById(`bidInput_${team.name}`);
    if (input) {
      const minBid = auctionState.currentBid + 100;
      input.min = minBid;
      input.max = teamBudgets[team.name];
      
      // Update placeholder if current value is less than minimum
      if (parseInt(input.value) < minBid) {
        input.value = minBid;
      }
      
      updatePlaceBidButton(team.name);
    }
  });
}

function updateAuctionStatusDisplay() {
  // Auction status display removed for cleaner header
  // This function is kept for compatibility but does nothing
}

function highlightBiddingTeam(teamName) {
  // Remove previous highlights
  document.querySelectorAll('.team-bid-card').forEach(card => {
    card.classList.remove('bidding-active');
  });
  
  // Add highlight to current bidding team
  const teamCard = document.querySelector(`.team-bid-card[data-team="${teamName}"]`);
  if (teamCard) {
    teamCard.classList.add('bidding-active');
    setTimeout(() => {
      teamCard.classList.remove('bidding-active');
    }, 2000);
  }
}

function celebrateTeamPurchase(teamName) {
  const team = kabaddiTeams.find(t => t.name === teamName);
  if (!team) return;
  
  // Create celebration effect
  const celebration = document.createElement('div');
  celebration.className = 'team-celebration';
  celebration.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${team.color};
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-weight: bold;
    z-index: 10000;
    animation: slideInRight 0.5s ease, fadeOut 0.5s ease 2s forwards;
  `;
  celebration.textContent = `🎉 ${teamName} wins the bid!`;
  
  document.body.appendChild(celebration);
  
  setTimeout(() => {
    if (celebration.parentNode) {
      celebration.parentNode.removeChild(celebration);
    }
  }, 3000);
}

// Utility functions
function showLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = "none";
  }
}

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease forwards";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function showAuctionModal(player, playerIndex) {
  // Remove existing modal if any
  const existingModal = document.getElementById("auctionModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = "auctionModal";
  modal.className = "auction-modal";
  
  const imageUrl = player["Upload Pic"];
  
  modal.innerHTML = `
    <div class="auction-modal-content">
      <div class="auction-header">
        <div class="auction-title">
          <h2>🔥 LIVE AUCTION</h2>
        </div>
      </div>
      
      <div class="auction-player-section">
        <div class="auction-player-info">
          <div class="auction-player-image-container"></div>
          <div class="auction-player-details">
            <h3>${player.Name}</h3>
            <p class="player-info">${player.Year} - ${player.Stream}</p>
            <p class="player-role">${player["Player's Role"]}</p>
          </div>
        </div>
        
        <div class="auction-status">
          <div class="current-bid">
            <span class="label">Current Bid:</span>
            <span class="amount" id="currentBid">₹${auctionState.currentBid.toLocaleString()}</span>
          </div>
          <div class="highest-bidder">
            <span class="label">Highest Bidder:</span>
            <span class="team" id="highestBidder">No bidder</span>
          </div>
        </div>
      </div>
      
      <div class="team-bidding-section">
        <h4>🤼 Team Bids</h4>
        <div class="teams-grid">
          ${kabaddiTeams.map(team => {
            const budget = teamBudgets[team.name];
            const minBid = auctionState.currentBid + 100;
            const playerCount = getTeamPlayerCount(team.name);
            const canBuy = canTeamBuyPlayer(team.name);
            
            return `
              <div class="team-bid-card ${!canBuy ? 'team-full' : ''}" data-team="${team.name}" style="border-color: ${team.color}">
                <div class="team-info">
                  <div class="team-header">
                    <span class="team-icon">${team.icon}</span>
                    <div class="team-name" style="color: ${team.color}">${team.name}</div>
                  </div>
                  <div class="team-full-name">${team.fullName}</div>
                  <div class="team-budget" style="color: ${budget < 1000 ? '#ff4444' : '#666'}">
                    ₹${budget.toLocaleString()} left
                  </div>
                  <div class="team-players" style="color: ${!canBuy ? '#ff4444' : '#666'}">
                    ${playerCount}/${MAX_PLAYERS_PER_TEAM} players
                  </div>
                </div>
                <div class="bid-controls">
                  <div class="bid-input-group ${!canBuy ? 'disabled' : ''}">
                    <button class="bid-adjust-btn" 
                            onclick="adjustBidAmount('${team.name}', -100)"
                            title="Decrease by ₹100"
                            ${!canBuy ? 'disabled' : ''}>
                      -₹100
                    </button>
                    <input type="number" 
                           class="bid-amount-input" 
                           id="bidInput_${team.name}"
                           placeholder="${minBid}"
                           min="${minBid}"
                           max="${budget}"
                           step="100"
                           value="${minBid}"
                           ${!canBuy ? 'disabled' : ''}>
                    <button class="bid-adjust-btn" 
                            onclick="adjustBidAmount('${team.name}', 100)"
                            title="Increase by ₹100"
                            ${!canBuy ? 'disabled' : ''}>
                      +₹100
                    </button>
                  </div>
                  <button class="place-bid-btn ${!canBuy ? 'disabled' : ''}" 
                          onclick="placeBidFromInput('${team.name}')"
                          data-team="${team.name}"
                          ${!canBuy ? 'disabled' : ''}>
                    ${!canBuy ? 'Team Full' : 'Place Bid'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="auction-actions">
        <button class="end-auction-btn" onclick="endAuction()">
          🔨 End Auction
        </button>
        <div class="auction-info">
          <small>Click "End Auction" when bidding is complete</small>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add the image with fallbacks to the auction modal
  const imageContainer = modal.querySelector('.auction-player-image-container');
  if (imageContainer) {
    const img = createImageWithFallbacks(imageUrl, player.Name, 'auction-player-image');
    imageContainer.appendChild(img);
  }
  
  // Initial display update
  updateAuctionDisplay();
}

function closeAuctionModal() {
  const modal = document.getElementById("auctionModal");
  if (modal) {
    modal.remove();
  }
}

function updateTeamBudgetDisplay() {
  // Update team budget displays wherever they appear
  const budgetElements = document.querySelectorAll('.team-budget');
  budgetElements.forEach(element => {
    const teamName = element.dataset.team;
    if (teamName && teamBudgets[teamName] !== undefined) {
      element.textContent = `₹${teamBudgets[teamName].toLocaleString()}`;
    }
  });
}

function renderCurrentView() {
  const activeBtn = document.querySelector('.toggle-btn.active');
  if (activeBtn) {
    if (activeBtn.id === 'gridBtn') {
      renderGridView();
    } else if (activeBtn.id === 'detailedBtn') {
      renderDetailedView(currentIndex);
    } else if (activeBtn.id === 'dashboardBtn') {
      renderDashboard(getAuctionData());
    }
  }
}

function validatePlayerData(player) {
  const requiredFields = ['Name', 'Year', 'Stream', "Player's Role"];
  const missing = requiredFields.filter(field => !player[field] || player[field].trim() === '');
  return missing.length === 0;
}

// Function to create an image with multiple fallback URLs
function createImageWithFallbacks(imageUrl, playerName, className) {
  const img = document.createElement('img');
  img.alt = playerName;
  img.className = className;
  img.loading = 'lazy';
  
  // Extract file ID for multiple fallback URLs
  let fileId = null;
  const patterns = [
    /(?:id=|\/d\/|\/file\/d\/|\/uc\?id=)([\w-]+)/,
    /drive\.google\.com\/open\?id=([\w-]+)/,
    /drive\.google\.com\/file\/d\/([\w-]+)/,
    /docs\.google\.com\/.*\/d\/([\w-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = imageUrl.match(pattern);
    if (match && match[1]) {
      fileId = match[1];
      break;
    }
  }
  
  if (fileId) {
    const fallbackUrls = [
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400-c`,
      `https://docs.google.com/uc?export=download&id=${fileId}`
    ];
    
    let currentIndex = 0;
    
    function tryNextUrl() {
      if (currentIndex < fallbackUrls.length) {
        console.log(`Trying image URL ${currentIndex + 1}/${fallbackUrls.length} for ${playerName}:`, fallbackUrls[currentIndex]);
        img.src = fallbackUrls[currentIndex];
        currentIndex++;
      } else {
        console.log(`All URLs failed for ${playerName}, using placeholder`);
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23764ba2;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23grad)' opacity='0.3'/%3E%3Ctext x='150' y='150' font-family='Inter, Arial, sans-serif' font-size='16' text-anchor='middle' dy='.3em' fill='%23ffffff' opacity='0.8'%3ENo Image%3C/text%3E%3C/svg%3E";
      }
    }
    
    img.onerror = function() {
      console.log(`Image failed to load: ${this.src}`);
      tryNextUrl();
    };
    
    img.onload = function() {
      console.log(`Image loaded successfully: ${this.src}`);
    };
    
    // Start with the first URL
    tryNextUrl();
  } else {
    // Not a Google Drive URL, use as is
    img.src = imageUrl;
    img.onerror = function() {
      console.log(`Direct image failed to load: ${this.src}`);
      this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23764ba2;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23grad)' opacity='0.3'/%3E%3Ctext x='150' y='150' font-family='Inter, Arial, sans-serif' font-size='16' text-anchor='middle' dy='.3em' fill='%23ffffff' opacity='0.8'%3ENo Image%3C/text%3E%3C/svg%3E";
    };
  }
  
  return img;
}

function getDirectGoogleDriveImage(url) {
  const placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23764ba2;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23grad)' opacity='0.3'/%3E%3Ctext x='150' y='150' font-family='Inter, Arial, sans-serif' font-size='16' text-anchor='middle' dy='.3em' fill='%23ffffff' opacity='0.8'%3ENo Image%3C/text%3E%3C/svg%3E";
  
  if (!url || typeof url !== "string") {
    console.log('No URL provided or invalid URL:', url);
    return placeholder;
  }
  
  console.log('Processing image URL:', url);
  
  // Extract Google Drive file ID from various URL formats
  let fileId = null;
  
  // Try different Google Drive URL patterns
  const patterns = [
    /(?:id=|\/d\/|\/file\/d\/|\/uc\?id=)([\w-]+)/,
    /drive\.google\.com\/open\?id=([\w-]+)/,
    /drive\.google\.com\/file\/d\/([\w-]+)/,
    /docs\.google\.com\/.*\/d\/([\w-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      fileId = match[1];
      console.log('Extracted file ID:', fileId);
      break;
    }
  }
  
  if (fileId) {
    // Try multiple Google Drive image endpoints for better compatibility
    const driveUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    console.log('Generated drive URL:', driveUrl);
    return driveUrl;
  }
  
  // If not a Google Drive URL, try to use it directly
  if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    console.log('Using direct image URL:', url);
    return url;
  }
  
  console.log('No valid image URL found, using placeholder');
  return placeholder;
}

function renderGridView() {
  console.log('renderGridView called with', players.length, 'players');
  showLoading();
  
  setTimeout(() => {
    mainView.innerHTML = `
      <div class="grid-team-budgets">
        <h3>Team Budgets & Progress</h3>
        <div class="teams-budget-grid">
          ${kabaddiTeams.map(team => {
            const budget = teamBudgets[team.name];
            const spent = 10000 - budget;
            const playerCount = getTeamPlayerCount(team.name);
            const budgetPercentage = (budget / 10000) * 100;
            const spentPercentage = ((10000 - budget) / 10000) * 100;
            const isOverspent = budget < 0;
            const isMaxPlayers = playerCount >= MAX_PLAYERS_PER_TEAM;
            
            return `
              <div class="team-budget-grid-card" style="border-color: ${team.color}">
                <div class="team-budget-header" style="background: linear-gradient(135deg, ${team.color}15, ${team.color}05)">
                  <div class="team-header-with-icon">
                    <span class="team-icon">${team.icon}</span>
                    <div class="team-name" style="color: ${team.color}">${team.name}</div>
                  </div>
                  <div class="team-full-name">${team.fullName}</div>
                </div>
                <div class="budget-display">
                  <div class="budget-amounts">
                    <div class="budget-item">
                      <span class="label">Remaining:</span>
                      <span class="amount ${isOverspent ? 'overspent' : ''}" style="color: ${isOverspent ? '#ff453a' : budget < 2000 ? '#ff9f0a' : '#32d74b'}">
                        ₹${budget.toLocaleString()}
                      </span>
                    </div>
                    <div class="budget-item">
                      <span class="label">Players:</span>
                      <span class="amount ${isMaxPlayers ? 'max-reached' : ''}">${playerCount}/${MAX_PLAYERS_PER_TEAM}</span>
                    </div>
                  </div>
                  <div class="budget-bar-container">
                    <div class="budget-bar-grid">
                      <div class="budget-spent" style="width: ${Math.min(100, spentPercentage)}%; background: ${team.color}"></div>
                      <div class="budget-remaining" style="width: ${Math.max(0, budgetPercentage)}%; background: ${isOverspent ? '#ff453a' : 'rgba(255,255,255,0.2)'}"></div>
                    </div>
                    <div class="budget-labels">
                      <span style="color: ${team.color}">Spent: ₹${spent.toLocaleString()}</span>
                    </div>
                  </div>
                  <div class="status-indicators">
                    ${isOverspent ? '<span class="status-badge overspent">⚠️ Over Budget</span>' : ''}
                    ${isMaxPlayers ? '<span class="status-badge full">🔒 Team Full</span>' : ''}
                    ${budget < 1000 && !isOverspent ? '<span class="status-badge low">⚡ Low Budget</span>' : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="player-grid"></div>
    `;
    
    const playerGrid = mainView.querySelector(".player-grid");
    console.log('Player grid container created:', playerGrid);
    
    players.forEach((player, i) => {
      console.log(`Rendering player ${i}:`, player.Name);
      const imageUrl = player["Upload Pic"];
      const card = document.createElement("div");
      card.className = "player-card";
      card.setAttribute("data-player-index", i);
      
      // Check if player is already sold
      const isSold = teamValues[i] && pointsValues[i];
      const soldTeam = isSold ? kabaddiTeams.find(team => team.name === teamValues[i]) : null;
      
      // Create the card structure
      const cardHTML = `
        <div class="player-image-container">
          ${isSold ? `<div class="sold-badge" style="background-color: ${soldTeam.color}">SOLD</div>` : ''}
        </div>
        <div class="player-info">
          <div class="player-details">
            <h3 class="player-name">${player.Name || "N/A"}</h3>
            <p class="player-year-stream">${player.Year || "N/A"} - ${player.Stream || "N/A"}</p>
            <div class="player-role">${player["Player's Role"] || "N/A"}</div>
          </div>
          
          ${isSold ? `
            <div class="sold-info">
              <div class="sold-team" style="color: ${soldTeam.color}; font-weight: bold;">
                <span class="team-icon">${soldTeam.icon}</span>
                ${soldTeam.name} - ₹${pointsValues[i].toLocaleString()}
              </div>
            </div>
          ` : `
            <div class="auction-controls">
              <button class="start-auction-btn" onclick="startAuction(${i})" 
                      ${auctionState.isAuctionActive ? 'disabled' : ''}>
                🔨 Start Auction
              </button>
            </div>
          `}
        </div>
      `;
      
      card.innerHTML = cardHTML;
      
      // Create and add the image with fallbacks
      const imageContainer = card.querySelector('.player-image-container');
      const img = createImageWithFallbacks(imageUrl, player.Name, 'player-image');
      imageContainer.appendChild(img);
      
      playerGrid.appendChild(card);
    });
    
    console.log('All cards rendered, attaching event listeners...');
    // Add event listeners for the newly created elements
    attachCardEventListeners();
    hideLoading();
    console.log('Grid view rendering complete');
  }, 100);
}

// Separate function for attaching event listeners - removed since manual controls were removed
function attachCardEventListeners() {
  // No longer needed since manual controls were removed
}

// Dedicated handler for points buttons - removed since manual controls were removed

function renderDetailedView(idx) {
  const player = players[idx];
  const imageUrl = player["Upload Pic"];
  
  // Check if player is already sold
  const isSold = teamValues[idx] && pointsValues[idx];
  const soldTeam = isSold ? kabaddiTeams.find(team => team.name === teamValues[idx]) : null;
  
  // Split teams into two groups for left and right sides
  const leftTeams = kabaddiTeams.slice(0, 3); // First 3 teams
  const rightTeams = kabaddiTeams.slice(3, 6); // Last 3 teams
  
  const renderTeamCards = (teams) => {
    return teams.map(team => {
      const budget = teamBudgets[team.name];
      const spent = 10000 - budget;
      const playerCount = getTeamPlayerCount(team.name);
      const budgetPercentage = (budget / 10000) * 100;
      const isOverspent = budget < 0;
      const isMaxPlayers = playerCount >= MAX_PLAYERS_PER_TEAM;
      
      return `
        <div class="team-budget-side-card" style="border-color: ${team.color}">
          <div class="team-header-side" style="background: linear-gradient(135deg, ${team.color}20, ${team.color}10)">
            <div class="team-name-with-icon">
              <span class="team-icon">${team.icon}</span>
              <div class="team-name" style="color: ${team.color}">${team.name}</div>
            </div>
            <div class="team-full-name">${team.fullName}</div>
          </div>
          <div class="budget-info-side">
            <div class="budget-stat">
              <span class="label">Budget:</span>
              <span class="value ${isOverspent ? 'overspent' : ''}" style="color: ${isOverspent ? '#ff453a' : budget < 2000 ? '#ff9f0a' : '#32d74b'}">
                ₹${budget.toLocaleString()}
              </span>
            </div>
            <div class="budget-stat">
              <span class="label">Players:</span>
              <span class="value ${isMaxPlayers ? 'max-reached' : ''}">${playerCount}/${MAX_PLAYERS_PER_TEAM}</span>
            </div>
            <div class="budget-bar-side">
              <div class="budget-progress" style="width: ${Math.max(0, budgetPercentage)}%; background: ${isOverspent ? '#ff453a' : budget < 2000 ? '#ff9f0a' : team.color}"></div>
            </div>
            ${isOverspent ? '<span class="warning-mini overspent">⚠️ Over Budget</span>' : ''}
            ${isMaxPlayers ? '<span class="warning-mini max-players">🔒 Full</span>' : ''}
            ${budget < 1000 && !isOverspent ? '<span class="warning-mini low-budget">⚡ Low</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  };
  
  mainView.innerHTML = `
    <div class="detailed-view-container">
      <!-- Left Team Cards -->
      <div class="teams-sidebar left-teams">
        <h4>Teams A-C</h4>
        ${renderTeamCards(leftTeams)}
      </div>

      <!-- Center Player Card -->
      <div class="player-card detailed-view" data-player-index="${idx}">
        <div class="player-image-container">
          ${isSold ? `<div class="sold-badge" style="background-color: ${soldTeam.color}">SOLD</div>` : ''}
        </div>
        <div class="player-info">
          <div class="player-details">
            <h3 class="player-name">${player.Name || "N/A"}</h3>
            <p class="player-year-stream">${player.Year || "N/A"} - ${player.Stream || "N/A"}</p>
            <div class="player-role">${player["Player's Role"] || "N/A"}</div>
          </div>
          
          ${isSold ? `
            <div class="sold-info">
              <div class="sold-team" style="color: ${soldTeam.color}; font-weight: bold;">
                <span class="team-icon">${soldTeam.icon}</span>
                ${soldTeam.name} - ₹${pointsValues[idx].toLocaleString()}
              </div>
            </div>
          ` : `
            <div class="auction-controls">
              <button class="start-auction-btn" onclick="startAuction(${idx})" 
                      ${auctionState.isAuctionActive ? 'disabled' : ''}>
                🔨 Start Auction
              </button>
            </div>
          `}
        </div>
      </div>

      <!-- Right Team Cards -->
      <div class="teams-sidebar right-teams">
        <h4>Teams D-F</h4>
        ${renderTeamCards(rightTeams)}
      </div>
    </div>
  `;
  detailedNav.style.display = "flex";
  
  // Update navigation counter
  const navCounter = document.getElementById("navCounter");
  if (navCounter) {
    navCounter.textContent = `${idx + 1} / ${players.length}`;
  }
  
  // Add the image with fallbacks to the detailed view
  const imageContainer = mainView.querySelector('.player-image-container');
  if (imageContainer) {
    const img = createImageWithFallbacks(imageUrl, player.Name, 'player-image');
    imageContainer.appendChild(img);
  }
  
  // Attach event listeners for the detailed view
  attachCardEventListeners();
}

function renderDashboard(data) {
  const teamsData = {};
  
  // Initialize teams data with budget information
  kabaddiTeams.forEach(team => {
    teamsData[team.name] = {
      ...team,
      players: [],
      totalSpent: 0,
      remainingBudget: teamBudgets[team.name],
      playerCount: 0,
      mostExpensive: 0,
      cheapest: Infinity
    };
  });
  
  const soldPlayers = data.filter(p => p.teamName && p.points);
  const unsoldPlayers = data.filter(p => !p.teamName || !p.points);
  const totalSpent = soldPlayers.reduce((sum, p) => sum + (parseInt(p.points) || 0), 0);

  // Populate team data
  soldPlayers.forEach(p => {
    if (teamsData[p.teamName]) {
      const price = parseInt(p.points) || 0;
      teamsData[p.teamName].players.push(p);
      teamsData[p.teamName].totalSpent += price;
      teamsData[p.teamName].playerCount++;
      teamsData[p.teamName].mostExpensive = Math.max(teamsData[p.teamName].mostExpensive, price);
      if (price > 0) {
        teamsData[p.teamName].cheapest = Math.min(teamsData[p.teamName].cheapest, price);
      }
    }
  });

  // Find the team with most spending, most players, etc.
  const teamStats = {
    highestSpending: kabaddiTeams.reduce((max, team) => 
      teamsData[team.name].totalSpent > teamsData[max.name].totalSpent ? team : max),
    mostPlayers: kabaddiTeams.reduce((max, team) => 
      teamsData[team.name].playerCount > teamsData[max.name].playerCount ? team : max),
    leastBudgetRemaining: kabaddiTeams.reduce((min, team) => 
      teamsData[team.name].remainingBudget < teamsData[min.name].remainingBudget ? team : min)
  };

  let html = `
    <div class="dashboard-header">
      <h2>🤼 Auction Dashboard</h2>
      <div class="auction-stats">
        <div class="stat-card">
          <div class="stat-number">${soldPlayers.length}</div>
          <div class="stat-label">Players Sold</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${unsoldPlayers.length}</div>
          <div class="stat-label">Players Unsold</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">₹${totalSpent.toLocaleString()}</div>
          <div class="stat-label">Total Spent</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">₹${(Object.values(teamBudgets).reduce((total, budget) => total + budget, 0)).toLocaleString()}</div>
          <div class="stat-label">Budget Remaining</div>
        </div>
      </div>
      
      <div class="auction-insights">
        <div class="insight-card">
          <span class="insight-label">Highest Spender:</span>
          <span class="insight-value" style="color: ${teamStats.highestSpending.color}">
            ${teamStats.highestSpending.name} (₹${teamsData[teamStats.highestSpending.name].totalSpent.toLocaleString()})
          </span>
        </div>
        <div class="insight-card">
          <span class="insight-label">Most Players:</span>
          <span class="insight-value" style="color: ${teamStats.mostPlayers.color}">
            ${teamStats.mostPlayers.name} (${teamsData[teamStats.mostPlayers.name].playerCount} players)
          </span>
        </div>
        <div class="insight-card">
          <span class="insight-label">Lowest Budget:</span>
          <span class="insight-value" style="color: ${teamStats.leastBudgetRemaining.color}">
            ${teamStats.leastBudgetRemaining.name} (₹${teamsData[teamStats.leastBudgetRemaining.name].remainingBudget.toLocaleString()})
          </span>
        </div>
      </div>
    </div>
    
    <div class="teams-dashboard-grid">
  `;
  
  // Team cards with enhanced information
  kabaddiTeams.forEach(team => {
    const teamData = teamsData[team.name];
    const avgPrice = teamData.playerCount > 0 ? teamData.totalSpent / teamData.playerCount : 0;
    const budgetUsedPercentage = (teamData.totalSpent / 10000) * 100;
    const isTeamFull = teamData.playerCount >= MAX_PLAYERS_PER_TEAM;
    const isLowBudget = teamData.remainingBudget < 500;
    const cheapest = teamData.cheapest === Infinity ? 0 : teamData.cheapest;
    
    html += `
      <div class="team-dashboard-card ${isTeamFull ? 'team-full' : ''} ${isLowBudget ? 'low-budget' : ''}" style="border-color: ${team.color}">
        <div class="team-header" style="background: linear-gradient(135deg, ${team.color}20, ${team.color}10)">
          <div class="team-title">
            <span class="team-icon">${team.icon}</span>
            <h3 style="color: ${team.color}">${team.name}</h3>
          </div>
          <p class="team-full-name">${team.fullName}</p>
          ${isTeamFull ? '<div class="team-status-badge full">TEAM FULL</div>' : ''}
          ${isLowBudget && !isTeamFull ? '<div class="team-status-badge low-budget">LOW BUDGET</div>' : ''}
        </div>
        
        <div class="team-stats">
          <div class="team-stat">
            <span class="stat-value ${isTeamFull ? 'text-warning' : ''}">${teamData.playerCount}</span>
            <span class="stat-label">Players</span>
          </div>
          <div class="team-stat">
            <span class="stat-value">₹${teamData.totalSpent.toLocaleString()}</span>
            <span class="stat-label">Spent</span>
          </div>
          <div class="team-stat">
            <span class="stat-value ${isLowBudget ? 'text-warning' : ''}">${teamData.remainingBudget < 0 ? '-' : ''}₹${Math.abs(teamData.remainingBudget).toLocaleString()}</span>
            <span class="stat-label">Remaining</span>
          </div>
          <div class="team-stat">
            <span class="stat-value">₹${Math.round(avgPrice).toLocaleString()}</span>
            <span class="stat-label">Avg Price</span>
          </div>
        </div>
        
        <div class="budget-bar">
          <div class="budget-used ${budgetUsedPercentage > 100 ? 'over-budget' : ''}" 
               style="width: ${Math.min(budgetUsedPercentage, 100)}%; background: ${budgetUsedPercentage > 100 ? '#ff4444' : team.color}">
          </div>
          ${budgetUsedPercentage > 100 ? `
            <div class="budget-overflow" style="width: ${Math.min(budgetUsedPercentage - 100, 50)}%; background: #ff4444"></div>
          ` : ''}
        </div>
        
        <div class="team-players">
          <h4>Squad (${teamData.playerCount}/${MAX_PLAYERS_PER_TEAM})</h4>
          ${teamData.players.length > 0 ? `
            <div class="players-list">
              ${teamData.players.map(p => `
                <div class="player-item">
                  <span class="player-name">${p.name}</span>
                  <span class="player-price">₹${parseInt(p.points).toLocaleString()}</span>
                </div>
              `).join("")}
            </div>
          ` : `
            <p class="no-players">No players acquired yet</p>
          `}
        </div>
      </div>
    `;
  });

  // Unsold players section with improved display
  html += `
    </div>
    
    <div class="unsold-section">
      <h3>Unsold Players (${unsoldPlayers.length})</h3>
      ${unsoldPlayers.length > 0 ? `
        <div class="unsold-players-grid">
          ${unsoldPlayers.map(p => `
            <div class="unsold-player-card">
              <div class="unsold-player-info">
                <span class="player-name">${p.name}</span>
                <div class="player-details">
                  <span class="player-year-stream">${p.year || 'N/A'} - ${p.stream || 'N/A'}</span>
                  <span class="player-role">${p.role || 'N/A'}</span>
                </div>
              </div>
              <button class="quick-auction-btn" onclick="startAuction(${players.findIndex(player => player.Name === p.name)})">
                🔨 Auction
              </button>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="no-unsold-players">
          <p>🎉 All players have been sold! Auction completed.</p>
        </div>
      `}
    </div>
  `;
  
  dashboardView.innerHTML = html;
}

// Function to get auction data for dashboard and export
function getAuctionData() {
  return players.map((player, i) => ({
    name: player.Name,
    teamName: teamValues[i] || null,
    points: pointsValues[i] || null,
    year: player.Year,
    stream: player.Stream,
    role: player["Player's Role"],
    email: player["Email Address"]
  }));
}

function updateAuctionState(index, team, points) {
  // Get previous values to calculate budget changes
  const previousTeam = teamValues[index];
  const previousPoints = parseInt(pointsValues[index]) || 0;
  const newPoints = parseInt(points) || 0;
  
  // Check if new team can accept more players
  if (team && team !== previousTeam && !canTeamBuyPlayer(team)) {
    showToast(`${team} already has ${MAX_PLAYERS_PER_TEAM} players! Cannot assign more.`, "error");
    return;
  }
  
  // Restore budget for previous team if any
  if (previousTeam && previousPoints > 0 && teamBudgets[previousTeam] !== undefined) {
    teamBudgets[previousTeam] += previousPoints;
  }
  
  // Deduct budget for new team if any
  if (team && newPoints > 0 && teamBudgets[team] !== undefined) {
    if (teamBudgets[team] < newPoints) {
      showToast(`${team} doesn't have enough budget! Available: ₹${teamBudgets[team].toLocaleString()}`, "error");
      return;
    }
    teamBudgets[team] -= newPoints;
  }
  
  // Update the values
  teamValues[index] = team;
  pointsValues[index] = points;
  
  // Update team player counts
  updateTeamPlayerCounts();
  
  // Update budget displays
  updateTeamBudgetDisplay();
  
  // Save state after manual assignment
  saveAuctionState();
  
  // Re-render current view to update displays
  renderCurrentView();
}

// Helper function to count players per team
function getTeamPlayerCount(teamName) {
  return teamValues.filter(team => team === teamName).length;
}

// Function to update team player counts
function updateTeamPlayerCounts() {
  kabaddiTeams.forEach(team => {
    teamPlayerCounts[team.name] = getTeamPlayerCount(team.name);
  });
}

// Function to check if team can buy more players
function canTeamBuyPlayer(teamName) {
  return getTeamPlayerCount(teamName) < MAX_PLAYERS_PER_TEAM;
}

function loadAuctionData(data) {
  // Reset team budgets first
  kabaddiTeams.forEach(team => {
    teamBudgets[team.name] = 10000;
  });
  
  // Load auction data and recalculate budgets
  data.forEach((item, i) => {
    if (i < players.length) {
      teamValues[i] = item.teamName || "";
      pointsValues[i] = item.points || "";
      
      // Deduct from team budget if player is sold
      if (item.teamName && item.points) {
        const points = parseInt(item.points) || 0;
        if (teamBudgets[item.teamName] !== undefined) {
          teamBudgets[item.teamName] -= points;
        }
      }
    }
  });
  
  // Update team player counts
  updateTeamPlayerCounts();
  
  // Update budget displays
  updateTeamBudgetDisplay();
}

// Reset all auction data
function resetAllData() {
  if (confirm('⚠️ This will reset all auction data and remove saved state. Are you sure?')) {
    // Clear localStorage
    clearSavedState();
    
    // Reset all global variables
    teamValues = Array(players.length).fill("");
    pointsValues = Array(players.length).fill("");
    currentIndex = 0;
    
    // Reset team budgets
    kabaddiTeams.forEach(team => {
      teamBudgets[team.name] = 10000;
      teamPlayerCounts[team.name] = 0;
    });
    
    // Reset auction state
    auctionState = {
      isAuctionActive: false,
      currentPlayer: null,
      currentBid: 0,
      basePrice: 0,
      highestBidder: null
    };
    
    // Re-render current view
    renderCurrentView();
    
    showToast('🔄 All auction data has been reset!', 'success');
  }
}

// Auto-save state persistence
const STORAGE_KEY = 'lePangaKabaddiAuction_v2';

// Save auction state to localStorage
function saveAuctionState() {
  const state = {
    players: players,
    teamValues: teamValues,
    pointsValues: pointsValues,
    teamBudgets: teamBudgets,
    teamPlayerCounts: teamPlayerCounts,
    currentIndex: currentIndex,
    auctionState: auctionState,
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log('Auction state saved automatically');
  } catch (error) {
    console.error('Failed to save auction state:', error);
  }
}

// Load auction state from localStorage
function loadAuctionState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      
      // Restore state variables
      players = state.players || [];
      teamValues = state.teamValues || [];
      pointsValues = state.pointsValues || [];
      teamBudgets = state.teamBudgets || {};
      teamPlayerCounts = state.teamPlayerCounts || {};
      currentIndex = state.currentIndex || 0;
      auctionState = state.auctionState || {
        isAuctionActive: false,
        currentPlayer: null,
        currentBid: 0,
        basePrice: 0,
        highestBidder: null
      };
      
      // Ensure team budgets and counts are initialized if missing
      kabaddiTeams.forEach(team => {
        if (!teamBudgets[team.name]) teamBudgets[team.name] = 10000;
        if (!teamPlayerCounts[team.name]) teamPlayerCounts[team.name] = 0;
      });
      
      console.log('Auction state loaded from localStorage');
      showToast('Previous auction session restored! 🔄', 'success');
      return true;
    }
  } catch (error) {
    console.error('Failed to load auction state:', error);
  }
  return false;
}

// Clear saved state
function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
  console.log('Saved auction state cleared');
}

// Show loading initially
showLoading();

// Check if we have saved state before loading from JSON
const hasSavedState = localStorage.getItem(STORAGE_KEY);

if (!hasSavedState) {
  // Load players data only if no saved state exists
  fetch('kabaddi_players.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Raw data loaded:', data.length, 'players');
      
      // Filter out invalid players and show warnings
      const validPlayers = data.filter(player => {
        if (!validatePlayerData(player)) {
          console.warn('Invalid player data:', player);
          return false;
        }
        return true;
      });

      if (validPlayers.length !== data.length) {
        showToast(`${data.length - validPlayers.length} invalid player entries were filtered out`, "warning");
      }

      players = validPlayers;
      teamValues = Array(players.length).fill("");
    pointsValues = Array(players.length).fill("");

    console.log('Valid players loaded:', players.length);

    // Player count display removed for cleaner header

    hideLoading();
    showToast(`Loaded ${players.length} players successfully!`);
    
    // Save initial state after loading players
    saveAuctionState();
    
    // Ensure we render the detailed view
    console.log('About to render detailed view...');
    renderDetailedView(currentIndex);
  })
  .catch(error => {
    hideLoading();
    console.error('Error loading players:', error);
    showToast('Failed to load players. Please check the data file.', 'error');
  });
} else {
  // Hide loading if we have saved state
  hideLoading();
}

// Event handlers - Updated to work with new structure
document.addEventListener("change", (e) => {
  // Manual controls removed - no longer needed
});

document.getElementById("gridBtn").addEventListener("click", () => {
  document.querySelectorAll(".toggle-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById("gridBtn").classList.add("active");
  mainView.style.display = "block";
  dashboardView.style.display = "none";
  detailedNav.style.display = "none";
  renderGridView();
});

document.getElementById("detailedBtn").addEventListener("click", () => {
  document.querySelectorAll(".toggle-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById("detailedBtn").classList.add("active");
  mainView.style.display = "block";
  dashboardView.style.display = "none";
  renderDetailedView(currentIndex);
});

document.getElementById("dashboardBtn").addEventListener("click", () => {
  document.querySelectorAll(".toggle-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById("dashboardBtn").classList.add("active");
  mainView.style.display = "none";
  dashboardView.style.display = "block";
  detailedNav.style.display = "none";
  renderDashboard(getAuctionData());
});

document.getElementById("prevBtn").addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + players.length) % players.length;
  renderDetailedView(currentIndex);
});

document.getElementById("nextBtn").addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % players.length;
  renderDetailedView(currentIndex);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const data = getAuctionData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "auction_state.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Auction state exported successfully!");
});

document.getElementById("uploadJson").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        loadAuctionData(data);
        renderGridView();
        // Save state after loading new data
        saveAuctionState();
        showToast("Auction state loaded successfully!");
      } catch (error) {
        showToast("Invalid JSON file", "error");
      }
    };
    reader.readAsText(file);
  }
});

document.getElementById("resetBtn").addEventListener("click", resetAllData);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Try to load saved state first
  const stateLoaded = loadAuctionState();
  
  // Set detailed view as active by default
  document.getElementById("detailedBtn").classList.add("active");
  
  // If state was loaded and players exist, render the appropriate view
  if (stateLoaded && players.length > 0) {
    renderDetailedView(currentIndex);
  }
});

// New functions for input-based bidding
function adjustBidAmount(teamName, amount) {
  if (!canTeamBuyPlayer(teamName)) {
    showToast(`${teamName} already has ${MAX_PLAYERS_PER_TEAM} players!`, "error");
    return;
  }
  
  const input = document.getElementById(`bidInput_${teamName}`);
  if (!input) return;
  
  const currentValue = parseInt(input.value) || parseInt(input.placeholder) || auctionState.currentBid + 100;
  const newValue = Math.max(auctionState.currentBid + 100, currentValue + amount);
  const maxValue = teamBudgets[teamName];
  
  input.value = Math.min(newValue, maxValue);
  
  // Update the place bid button state
  updatePlaceBidButton(teamName);
}

function placeBidFromInput(teamName) {
  const input = document.getElementById(`bidInput_${teamName}`);
  if (!input) return;
  
  const bidAmount = parseInt(input.value);
  if (!bidAmount || isNaN(bidAmount)) {
    showToast("Please enter a valid bid amount!", "error");
    return;
  }
  
  placeBid(teamName, bidAmount);
}

function updatePlaceBidButton(teamName) {
  const input = document.getElementById(`bidInput_${teamName}`);
  const button = document.querySelector(`.place-bid-btn[data-team="${teamName}"]`);
  
  if (!input || !button) return;
  
  const bidAmount = parseInt(input.value) || 0;
  const canAfford = teamBudgets[teamName] >= bidAmount;
  const isHigherBid = bidAmount > auctionState.currentBid;
  const isValidBid = bidAmount >= auctionState.currentBid + 100;
  const canBuyPlayer = canTeamBuyPlayer(teamName);
  
  button.disabled = !canAfford || !isHigherBid || !isValidBid || !canBuyPlayer;
  
  if (!canBuyPlayer) {
    button.title = `Team already has ${MAX_PLAYERS_PER_TEAM} players`;
    button.classList.add('disabled');
    button.textContent = 'Team Full';
  } else if (!canAfford) {
    button.title = "Insufficient budget";
    button.classList.add('disabled');
    button.textContent = 'Place Bid';
  } else if (!isValidBid) {
    button.title = `Minimum bid: ₹${(auctionState.currentBid + 100).toLocaleString()}`;
    button.classList.add('disabled');
    button.textContent = 'Place Bid';
  } else {
    button.title = `Place bid of ₹${bidAmount.toLocaleString()}`;
    button.classList.remove('disabled');
    button.textContent = 'Place Bid';
  }
}

// Add event listeners for bid inputs
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('bid-amount-input')) {
    const teamName = e.target.id.replace('bidInput_', '');
    updatePlaceBidButton(teamName);
  }
});

// Theme management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  
  // Apply saved theme
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Update icon
  if (savedTheme === 'light') {
    themeIcon.textContent = '☀️';
  } else {
    themeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  const themeIcon = document.querySelector('.theme-icon');
  
  // Apply new theme
  document.documentElement.setAttribute('data-theme', newTheme);
  
  // Update icon with animation
  themeIcon.style.transform = 'rotate(180deg)';
  setTimeout(() => {
    themeIcon.textContent = newTheme === 'light' ? '☀️' : '🌙';
    themeIcon.style.transform = 'rotate(0deg)';
  }, 150);
  
  // Save to localStorage
  localStorage.setItem('theme', newTheme);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  
  // Add theme toggle event listener
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Auto-load saved state
  loadAuctionState();
  
  // If no state was loaded, render detailed view by default
  if (!loadAuctionState()) {
    renderDetailedView(currentIndex);
  }
  
  // Auto-save state every minute
  setInterval(saveAuctionState, 60 * 1000);
});
