import { Component, ElementRef, ViewChild, AfterViewInit, Renderer2 } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass, NgStyle, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Card {
  suit: string;
  rank: string;
  frontImage: string;
  backImage: string;
  isRevealed: boolean;
  isDragging: boolean;
  translateX: number;
  translateY: number;
  isRising?: boolean;
}

interface Player {
  id: number;
  name: string;
  avatar: string;
  balance: number;
  currentBet: number;
  cards: Card[];
  positionClass: string;
  isTurn: boolean;
  choice: 'တော်ပြီ' | 'ထပ်ဆွဲမယ်' | null;
  points?: string;
  pointsValue?: number;
  isDealer: boolean;
}

interface Dealer {
  name: string;
  avatar: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, NgClass, NgStyle, FormsModule, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  players: Player[] = [
    { id: 1, name: '..ကိုကျော်ကြီး..', avatar: '/assets/images/user9.jpg', balance: 999999, currentBet: 0, cards: [], positionClass: 'player-bottom-left', isTurn: false, choice: null, isDealer: false },
    { id: 2, name: '..ကိုထက်ဖြိုး..', avatar: '/assets/images/user2.jpg', balance: 398971, currentBet: 0, cards: [], positionClass: 'player-left-middle', isTurn: false, choice: null, isDealer: false },
    { id: 3, name: 'maအောင်ပြည့်', avatar: '/assets/images/user3.jpg', balance: 2457996, currentBet: 0, cards: [], positionClass: 'player-top-right', isTurn: false, choice: null, isDealer: false },
    { id: 4, name: '...Ooသူရိန်စိုး.', avatar: '/assets/images/user4.jpg', balance: 3399980, currentBet: 0, cards: [], positionClass: 'player-right-middle', isTurn: false, choice: null, isDealer: false },
    { id: 5, name: '.Shan Lay', avatar: '/assets/images/user5.jpg', balance: 357990, currentBet: 0, cards: [], positionClass: 'player-bottom-right', isTurn: false, choice: null, isDealer: false },
    { id: 6, name: ' ..mamaei.. ', avatar: '/assets/images/user6.jpg', balance: 2457996, currentBet: 0, cards: [], positionClass: 'player-top-middle', isTurn: false, choice: null, isDealer: false },
  ];

  dealer: Dealer = {
    name: 'ဖဲဝေသူ',
    avatar: '/assets/images/Girl.png'
  };

  potAmount = 0;
  isShuffling = false;
  isDealing = false;
  deck: Card[] = [];
  currentBetAmount = 0;
  countdown = 7;
  isCountingDown = false;
  isBettingPhase = false;
  cardDealingInterval: any;
  showChoiceSection = false;
  touchStartX = 0;
  touchDeltaX = 0;
  revealTimeout: any;

  @ViewChild('betAmountSlider') betAmountSliderRef!: ElementRef<HTMLInputElement>;
  @ViewChild('tableFelt') tableFeltRef!: ElementRef<HTMLDivElement>;

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    if (this.betAmountSliderRef) {
      this.betAmountSliderRef.nativeElement.min = '1000';
      this.betAmountSliderRef.nativeElement.max = '100000';
    }
    this.startNewRound();
  }

  startNewRound() {
    this.resetRound();
    this.startBettingPhase();
  }

  resetRound() {
    this.players.forEach(player => {
      player.cards = [];
      player.isTurn = false;
      player.choice = null;
      player.points = undefined;
      player.pointsValue = undefined;
      player.currentBet = 0;
    });
    this.deck = [];
    this.isDealing = false;
    this.isShuffling = false;
    this.isCountingDown = false;
    this.isBettingPhase = false;
    this.currentBetAmount = 0;
    this.showChoiceSection = false;
    this.touchDeltaX = 0;
    clearInterval(this.cardDealingInterval);
    clearTimeout(this.revealTimeout);
  }

  startBettingPhase() {
    this.isBettingPhase = true;
    this.countdown = 7;
    this.isCountingDown = true;
    const bettingInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(bettingInterval);
        this.isCountingDown = false;
        this.isBettingPhase = false;
        this.deck = this.shuffleDeck(this.generateDeck());
        this.dealInitialCards();
      }
    }, 1000);
  }

  updateBetAmountFromSlider() {
    if (this.isBettingPhase) {
      this.currentBetAmount = parseInt(this.betAmountSliderRef.nativeElement.value, 10) || 0;
    }
  }

  placeBet() {
    if (this.isBettingPhase && this.currentBetAmount > 0) {
      const canAllPlayersBet = this.players.every(player => player.balance >= this.currentBetAmount);
      if (!canAllPlayersBet) {
        console.log('ထိုးကြေးထည့်လို့မရပါ။ ကစားသမားအချို့တွင် လက်ကျန်ငွေ မလုံလောက်ပါ။');
        return;
      }

      console.log(`ထိုးကြေးထည့်လိုက်ပြီ: ${this.currentBetAmount}`);
      this.potAmount += this.currentBetAmount * this.players.length;
      this.players.forEach(player => {
        player.currentBet += this.currentBetAmount;
        player.balance -= this.currentBetAmount;
      });
      this.currentBetAmount = 0;
      this.betAmountSliderRef.nativeElement.value = '0';
    } else {
      console.log('ထိုးကြေးထည့်လို့မရပါ။ ထိုးကြေးပမာဏရွေးပါ သို့မဟုတ် အချိန်ကုန်သွားပါပြီ။');
    }
  }

  dealInitialCards() {
    if (!this.isDealing && this.deck.length >= this.players.length * 2) {
      this.isDealing = true;
      let cardDealCount = 0;
      const playersToDeal = this.players;
      const totalCardsToDeal = playersToDeal.length * 2;

      const dealerElement = document.querySelector('.dealer') as HTMLElement;
      const dealerRect = dealerElement.getBoundingClientRect();

      this.cardDealingInterval = setInterval(() => {
        if (cardDealCount < totalCardsToDeal) {
          const playerIndex = cardDealCount % playersToDeal.length;
          const cardIndex = Math.floor(cardDealCount / playersToDeal.length);
          const player = playersToDeal[playerIndex];
          const cardData = this.deck.pop();

          if (cardData) {
            const tempCardElement = this.renderer.createElement('div');
            this.renderer.addClass(tempCardElement, 'flying-card');
            this.renderer.setStyle(tempCardElement, 'left', `${dealerRect.left + dealerRect.width / 2 - 15}px`);
            this.renderer.setStyle(tempCardElement, 'top', `${dealerRect.top + dealerRect.height / 2 - 22.5}px`);
            this.renderer.appendChild(document.body, tempCardElement);

            const playerElement = document.querySelector(`.${player.positionClass}`) as HTMLElement;
            const playerCardsContainer = playerElement.querySelector('.player-cards') as HTMLElement;
            const playerCardsRect = playerCardsContainer.getBoundingClientRect();

            let targetX = playerCardsRect.left;
            let targetY = playerCardsRect.top;

            if (cardIndex === 1) {
              targetX += 15;
            }

            this.renderer.setStyle(tempCardElement, 'transition', 'all 0.5s ease-in-out');
            this.renderer.setStyle(tempCardElement, 'left', `${targetX + playerCardsRect.width / 2 - 15}px`);
            this.renderer.setStyle(tempCardElement, 'top', `${targetY + playerCardsRect.height / 2 - 22.5}px`);
            this.renderer.setStyle(tempCardElement, 'opacity', '1');

            setTimeout(() => {
              player.cards.push({
                ...cardData,
                isRevealed: false,
                isDragging: false,
                translateX: cardIndex === 0 ? 0 : 15,
                translateY: 0
              });
              this.renderer.removeChild(document.body, tempCardElement);
              cardDealCount++;
            }, 500);
          }
        } else {
          clearInterval(this.cardDealingInterval);
          this.isDealing = false;
          console.log('ဖဲဝေပြီးပြီ။');
          this.startRevealForKoKyawGyi();
        }
      }, 600);
    } else {
      console.log('ဖဲဝေလို့မရဘူး။');
    }
  }

  startRevealForKoKyawGyi() {
    const koKyawGyi = this.players.find(player => player.id === 1);
    if (koKyawGyi && koKyawGyi.cards.length === 2) {
      koKyawGyi.isTurn = true;
      this.moveCardsToCenter(koKyawGyi);

      this.countdown = 10;
      this.isCountingDown = true;
      const revealInterval = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          clearInterval(revealInterval);
          this.isCountingDown = false;
          this.revealAllCards();
        }
      }, 1000);
    } else {
      console.log('ကိုကျော်ကြီးရဲ့ ဖဲကဒ်မရှိဘူး။');
      this.startNewRound();
    }
  }

  moveCardsToCenter(player: Player) {
    const tableFelt = this.tableFeltRef.nativeElement;
    const tableRect = tableFelt.getBoundingClientRect();
    const centerX = tableRect.left + tableRect.width - 1220;
    const centerY = tableRect.top + tableRect.height - 420;

    player.cards.forEach((card, index) => {
      const cardElement = document.querySelector(`.${player.positionClass} .card-${index + 1}`) as HTMLElement;
      if (cardElement) {
        this.renderer.setStyle(cardElement, 'position', 'absolute');
        this.renderer.setStyle(cardElement, 'left', `${centerX + (index * 16 - 3)}px`);
        this.renderer.setStyle(cardElement, 'top', `${centerY}px`);
        this.renderer.setStyle(cardElement, 'width', '170px');
        this.renderer.setStyle(cardElement, 'height', '260px');
        this.renderer.setStyle(cardElement, 'transition', 'all 1s ease-in-out');
        this.renderer.setStyle(cardElement, 'z-index', '2000');
        if (index === 0) card.isRevealed = true;
      }
    });

    const secondCard = player.cards[1];
    const secondCardElement = document.querySelector(`.${player.positionClass} .card-2`) as HTMLElement;
    if (secondCardElement) {
      secondCardElement.addEventListener('click', () => {
        if (!secondCard.isRevealed) {
          this.renderer.setStyle(secondCardElement, 'transition', 'left 0.5s ease-in-out');
          this.renderer.setStyle(secondCardElement, 'left', `${centerX + (1 * 16 - 3) + 50}px`);
          setTimeout(() => {
            secondCard.isRevealed = true;
            this.showChoiceSection = true;
            this.renderer.setStyle(secondCardElement, 'transition', 'all 0.5s ease-in-out');
          }, 500);
        }
      });
    }
  }

  makeChoice(choice: 'တော်ပြီ' | 'ထပ်ဆွဲမယ်') {
    const koKyawGyi = this.players.find(player => player.id === 1);
    if (koKyawGyi) {
      koKyawGyi.choice = choice;
      const tableFelt = this.tableFeltRef.nativeElement;
      const tableRect = tableFelt.getBoundingClientRect();
      const centerX = tableRect.left + tableRect.width - 1200;
      const centerY = tableRect.top + tableRect.height - 450;

      if (choice === 'တော်ပြီ') {
        this.showChoiceSection = false;
        koKyawGyi.points = this.getCardPoints(koKyawGyi.cards);
        koKyawGyi.pointsValue = this.getPointsValue(koKyawGyi.points);
        this.moveCardsBackToPlayer(koKyawGyi);
      } else if (choice === 'ထပ်ဆွဲမယ်') {
        this.showChoiceSection = false;
        if (this.deck.length > 0) {
          const newCard = this.deck.pop();
          if (newCard) {
            const dealerElement = document.querySelector('.dealer') as HTMLElement;
            const dealerRect = dealerElement.getBoundingClientRect();
            const tempCardElement = this.renderer.createElement('div');
            this.renderer.addClass(tempCardElement, 'flying-card');
            this.renderer.setStyle(tempCardElement, 'left', `${dealerRect.left + dealerRect.width / 2 - 100}px`);
            this.renderer.setStyle(tempCardElement, 'top', `${dealerRect.top + dealerRect.height / 2 - 150}px`);
            this.renderer.setStyle(tempCardElement, 'width', '200px');
            this.renderer.setStyle(tempCardElement, 'height', '300px');
            this.renderer.appendChild(document.body, tempCardElement);

            const targetX = centerX + (2 * 150 - 80);
            const targetY = centerY;

            this.renderer.setStyle(tempCardElement, 'transition', 'all 0.5s ease-in-out');
            this.renderer.setStyle(tempCardElement, 'left', `${targetX}px`);
            this.renderer.setStyle(tempCardElement, 'top', `${targetY}px`);
            this.renderer.setStyle(tempCardElement, 'opacity', '1');

            setTimeout(() => {
              koKyawGyi.cards.push({
                ...newCard,
                isRevealed: true,
                isDragging: false,
                translateX: 0,
                translateY: 0
              });

              const newCardElement = document.querySelector(`.${koKyawGyi.positionClass} .card-3`) as HTMLElement;
              if (newCardElement) {
                this.renderer.setStyle(newCardElement, 'position', 'absolute');
                this.renderer.setStyle(newCardElement, 'left', `${centerX + (2 * 150 - 80)}px`);
                this.renderer.setStyle(newCardElement, 'top', `${centerY}px`);
                this.renderer.setStyle(newCardElement, 'width', '200px');
                this.renderer.setStyle(newCardElement, 'height', '300px');
                this.renderer.setStyle(newCardElement, 'transition', 'all 0.5s ease-in-out');
                this.renderer.setStyle(newCardElement, 'z-index', '2000');
              }

              this.renderer.removeChild(document.body, tempCardElement);
              koKyawGyi.points = this.getCardPoints(koKyawGyi.cards);
              koKyawGyi.pointsValue = this.getPointsValue(koKyawGyi.points);

              setTimeout(() => {
                this.moveCardsBackToPlayer(koKyawGyi);
              }, 2000);
            }, 500);
          }
        }
      }
    }
  }

  moveCardsBackToPlayer(player: Player) {
    player.cards.forEach((card, index) => {
      const cardElement = document.querySelector(`.${player.positionClass} .card-${index + 1}`) as HTMLElement;
      if (cardElement) {
        const playerElement = document.querySelector(`.${player.positionClass}`) as HTMLElement;
        const playerCardsContainer = playerElement.querySelector('.player-cards') as HTMLElement;
        const playerCardsRect = playerCardsContainer.getBoundingClientRect();
        this.renderer.setStyle(cardElement, 'position', 'absolute');
        this.renderer.setStyle(cardElement, 'left', `${index * 7 - 5}px`);
        this.renderer.setStyle(cardElement, 'top', '0px');
        this.renderer.setStyle(cardElement, 'width', '30px');
        this.renderer.setStyle(cardElement, 'height', '45px');
        this.renderer.setStyle(cardElement, 'transition', 'all 1s ease-in-out');
        this.renderer.setStyle(cardElement, 'z-index', '10');
      }
    });
  }

  revealAllCards() {
    this.players.forEach(player => {
      player.cards.forEach((card, index) => {
        card.isRevealed = true;
        const cardElement = document.querySelector(`.${player.positionClass} .card-${index + 1}`) as HTMLElement;
        if (cardElement) {
          const playerElement = document.querySelector(`.${player.positionClass}`) as HTMLElement;
          const playerCardsContainer = playerElement.querySelector('.player-cards') as HTMLElement;
          const playerCardsRect = playerCardsContainer.getBoundingClientRect();
          this.renderer.setStyle(cardElement, 'position', 'absolute');
          this.renderer.setStyle(cardElement, 'left', `${index * 7 - 5}px`);
          this.renderer.setStyle(cardElement, 'top', '0px');
          this.renderer.setStyle(cardElement, 'width', '30px');
          this.renderer.setStyle(cardElement, 'height', '45px');
          this.renderer.setStyle(cardElement, 'transition', 'all 1s ease-in-out');
          this.renderer.setStyle(cardElement, 'z-index', '10');
        }
      });
      player.points = this.getCardPoints(player.cards);
      player.pointsValue = this.getPointsValue(player.points);
      player.isTurn = false;
    });
    this.showChoiceSection = false;

    this.calculateAndDistributeBets();

    setTimeout(() => {
      this.startNewRound();
    }, 10000);
  }

  getPointsValue(points: string | undefined): number {
    if (!points) return 0;
    const match = points.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  calculateAndDistributeBets() {
    const sortedPlayers = [...this.players].sort((a, b) => (b.pointsValue || 0) - (a.pointsValue || 0));

    console.log('ပေါက်ဂဏန်းအလိုက် အစဉ်လိုက် ကစားသမားများ:');
    sortedPlayers.forEach(player => {
      console.log(`${player.name}: ${player.points} (${player.pointsValue})`);
    });

    const winner = sortedPlayers[0];
    const winnerPointsValue = winner.pointsValue || 0;

    const totalPot = this.potAmount;
    console.log(`အနိုင်ရသူ: ${winner.name} (${winner.points})`);
    console.log(`စုစုပေါင်း ထိုးကြေး: ${totalPot}`);

    winner.balance += totalPot;
    console.log(`${winner.name} ရဲ့ လက်ကျန်ငွေ (အနိုင်ရပြီးနောက်): ${winner.balance}`);

    sortedPlayers.forEach(player => {
      if (player !== winner) {
        console.log(`${player.name} ရဲ့ လက်ကျန်ငွေ (အရှုံးပြီးနောက်): ${player.balance}`);
      }
    });

    this.potAmount = 0;
    this.players.forEach(player => {
      player.currentBet = 0;
    });
  }

  getCardPoints(cards: Card[]): string {
    let total = 0;
    for (const card of cards) {
      let rankValue = parseInt(card.rank, 10);
      if (isNaN(rankValue)) {
        if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
          total += 10;
        } else if (card.rank === 'A') {
          total += 1;
        }
      } else {
        total += rankValue;
      }
    }
    const remainder = total % 10;
    if (cards.length === 3) {
      if (remainder === 0) return '၀ပေါက်';
      return `${remainder}ပေါက်`;
    }
    if (remainder === 1) {
      return '1ပေါက်';
    } else if (remainder === 9) {
      return '၉ဒို';
    } else if (remainder === 8) {
      return '၈ဒို';
    } else if (remainder === 7) {
      return '၇ပေါက်';
    } else if (remainder === 6) {
      return '၆ပေါက်';
    } else if (remainder === 5) {
      return '၅ပေါက်';
    } else if (remainder === 4) {
      return '၄ပေါက်';
    } else if (remainder === 3) {
      return '၃ပေါက်';
    } else if (remainder === 2) {
      return '၂ပေါက်';
    }
    return `${remainder} ဘူ`;
  }

  generateDeck(): Card[] {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'J', 'Q', 'K'];
    const deck: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        const suitCode = suit === '♠' ? 'S' : suit === '♥' ? 'H' : suit === '♦' ? 'D' : 'C';
        const frontImage = `/assets/images/cards/${rank}${suitCode}.png`;
        const backImage = '/assets/images/card back blue.png';
        deck.push({ suit, rank, frontImage, backImage, isRevealed: false, isDragging: false, translateX: 0, translateY: 0 });
      }
    }
    return deck;
  }

  shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  handleCardClick(player: Player, card: Card, cardIndex: number, event: MouseEvent) {
    if (cardIndex === 1 && !card.isRevealed && player.isTurn && player.id === 1) {
      const secondCardElement = document.querySelector(`.${player.positionClass} .card-2`) as HTMLElement;
      if (secondCardElement) {
        const currentLeft = parseFloat(secondCardElement.style.left) || (cardIndex * 60 - 22);
        this.renderer.setStyle(secondCardElement, 'transition', 'left 0.5s ease-in-out');
        this.renderer.setStyle(secondCardElement, 'left', `${currentLeft + 50}px`);
        setTimeout(() => {
          card.isRevealed = true;
          this.showChoiceSection = true;
          this.renderer.setStyle(secondCardElement, 'transition', 'all 0.5s ease-in-out');
        }, 500);
      }
    }
  }

  onTouchStart(event: TouchEvent, player: Player, card: Card, cardIndex: number) {
    event.preventDefault();
    if (cardIndex === 1 && !card.isRevealed && player.isTurn && player.id === 1) {
      this.touchStartX = event.touches[0].clientX;
      card.isDragging = true;
    }
  }

  onTouchMove(event: TouchEvent, player: Player, card: Card, cardIndex: number) {
    if (card.isDragging && cardIndex === 1 && !card.isRevealed && player.isTurn && player.id === 1) {
      const touchX = event.touches[0].clientX;
      this.touchDeltaX = touchX - this.touchStartX;
      const secondCardElement = document.querySelector(`.${player.positionClass} .card-2`) as HTMLElement;
      if (secondCardElement) {
        const currentLeft = parseFloat(secondCardElement.style.left) || (cardIndex * 60 - 22);
        const newLeft = currentLeft + this.touchDeltaX;
        this.renderer.setStyle(secondCardElement, 'transition', 'none');
        this.renderer.setStyle(secondCardElement, 'left', `${newLeft}px`);
      }
    }
  }

  onTouchEnd(event: TouchEvent, player: Player, card: Card, cardIndex: number) {
    if (card.isDragging && cardIndex === 1 && !card.isRevealed && player.isTurn && player.id === 1) {
      card.isDragging = false;
      const secondCardElement = document.querySelector(`.${player.positionClass} .card-2`) as HTMLElement;
      if (secondCardElement) {
        const currentLeft = parseFloat(secondCardElement.style.left) || (cardIndex * 60 - 22);
        if (this.touchDeltaX >= 50 && this.touchDeltaX <= 100) {
          this.renderer.setStyle(secondCardElement, 'transition', 'left 0.5s ease-in-out');
          this.renderer.setStyle(secondCardElement, 'left', `${currentLeft + 50 - this.touchDeltaX}px`);
          setTimeout(() => {
            card.isRevealed = true;
            this.showChoiceSection = true;
            this.renderer.setStyle(secondCardElement, 'transition', 'all 0.5s ease-in-out');
          }, 500);
        } else {
          this.renderer.setStyle(secondCardElement, 'transition', 'left 0.5s ease-in-out');
          this.renderer.setStyle(secondCardElement, 'left', `${currentLeft - this.touchDeltaX}px`);
        }
      }
      this.touchDeltaX = 0;
    }
  }
}