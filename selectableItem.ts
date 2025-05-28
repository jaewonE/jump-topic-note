import { App, Modal } from "obsidian";

/**
 * SelectableModal에 표시될 항목의 기본 인터페이스입니다.
 * 각 항목은 화면에 표시될 'name' 속성을 가져야 합니다.
 */
export interface SelectableItem {
	name: string;
	[key: string]: any; // 다른 플러그인에서 추가적인 데이터를 포함할 수 있도록 허용
}

/**
 * 항목이 선택되었을 때 호출될 콜백 함수의 타입입니다.
 * 선택된 항목 객체를 인자로 받습니다.
 */
export type ItemSelectionCallback<T extends SelectableItem> = (item: T) => void;

/**
 * 사용자 정의 가능한 선택 목록을 표시하는 재사용 가능한 모달 클래스입니다.
 * 키보드(방향키, Enter) 및 마우스(클릭, 호버) 상호작용을 지원합니다.
 */
export class SelectableModal<T extends SelectableItem> extends Modal {
	private items: T[];
	private callback: ItemSelectionCallback<T>;
	private modalTitle: string;

	private activeIndex: number = 0;
	private hoveredIndex: number | null = null;
	private itemElements: HTMLElement[] = [];

	/**
	 * SelectableModal의 새 인스턴스를 생성합니다.
	 * @param app - 현재 Obsidian App 인스턴스입니다.
	 * @param items - 모달에 표시할 항목의 배열입니다. 각 항목은 SelectableItem 인터페이스를 만족해야 합니다.
	 * @param callback - 사용자가 항목을 선택했을 때 실행될 함수입니다.
	 * @param modalTitle - (선택 사항) 모달 창의 제목입니다. 기본값은 "옵션 선택"입니다.
	 */
	constructor(
		app: App,
		items: T[],
		callback: ItemSelectionCallback<T>,
		modalTitle: string = "옵션 선택"
	) {
		super(app);
		this.items = items;
		this.callback = callback;
		this.modalTitle = modalTitle;

		// Escape 키로 모달 닫기
		this.scope.register([], "Escape", () => {
			this.close();
			return false; // 이벤트 전파 중단
		});

		// 모달 컨테이너에 사용자 정의 클래스 추가 (스타일링 목적)
		this.containerEl.addClass("selectable-modal");
	}

	/**
	 * 모달이 열릴 때 호출됩니다.
	 * 모달의 내용을 구성하고 이벤트 리스너를 설정합니다.
	 */
	onOpen() {
		const { contentEl } = this;
		contentEl.empty(); // 이전 내용이 있다면 지웁니다.

		contentEl.createEl("h4", { text: this.modalTitle });

		this.itemElements = []; // 항목 엘리먼트 배열 초기화
		this.items.forEach((item, index) => {
			const itemEl = contentEl.createDiv({ cls: "selectable-item" });
			itemEl.textContent = item.name;
			itemEl.tabIndex = 0; // allow programmatic and keyboard focus

			itemEl.addEventListener("click", () => this.selectItem(index));
			itemEl.addEventListener("mouseover", () =>
				this.handleMouseOver(index)
			);
			itemEl.addEventListener("mouseleave", () =>
				this.handleMouseLeave()
			);

			this.itemElements.push(itemEl);
		});

		// 항목이 있을 경우 첫 번째 항목에 포커스
		if (this.itemElements.length > 0) {
			this.activeIndex = 0;
			this.focusItem(this.activeIndex);
		}

		// 키보드 네비게이션 이벤트 핸들러 등록
		this.scope.register([], "ArrowUp", () => {
			this.navigateItems(-1); // 위로 이동
			return false;
		});
		this.scope.register([], "ArrowDown", () => {
			this.navigateItems(1); // 아래로 이동
			return false;
		});
		this.scope.register([], "Enter", () => {
			if (
				this.activeIndex >= 0 &&
				this.activeIndex < this.itemElements.length
			) {
				// 현재 활성화된 항목의 클릭 이벤트 트리거
				this.itemElements[this.activeIndex].click();
			}
			return false;
		});
	}

	/**
	 * 모달이 닫힐 때 호출됩니다.
	 * 내용을 비우고 리소스를 정리합니다.
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.itemElements = [];
		this.hoveredIndex = null;
		// activeIndex는 다음에 열릴 때를 위해 0으로 리셋하거나 현재 상태 유지 (여기서는 리셋 안 함)
	}

	/**
	 * 키보드 방향키로 항목 간 이동을 처리합니다.
	 * @param direction - 이동 방향 (-1: 위, 1: 아래).
	 */
	private navigateItems(direction: number): void {
		if (this.itemElements.length === 0) return;

		// 마우스 호버 중이었다면, 호버된 항목을 현재 활성 인덱스로 설정
		if (this.hoveredIndex !== null) {
			this.activeIndex = this.hoveredIndex;
			this.hoveredIndex = null; // 키보드 사용 시작 시 호버 상태 해제
		}

		// 다음 활성 인덱스 계산 (배열 범위 내 순환)
		const newIndex = this.activeIndex + direction;
		if (newIndex < 0) {
			this.activeIndex = this.itemElements.length - 1; // 맨 위에서 위로 가면 맨 아래로
		} else if (newIndex >= this.itemElements.length) {
			this.activeIndex = 0; // 맨 아래에서 아래로 가면 맨 위로
		} else {
			this.activeIndex = newIndex;
		}

		this.focusItem(this.activeIndex);
	}

	/**
	 * 마우스가 항목 위에 올라왔을 때 호출됩니다.
	 * @param index - 호버된 항목의 인덱스입니다.
	 */
	private handleMouseOver(index: number): void {
		this.hoveredIndex = index;
		this.focusItem(index); // 호버된 항목에 포커스 스타일 적용
	}

	/**
	 * 마우스가 항목에서 벗어났을 때 호출됩니다.
	 */
	private handleMouseLeave(): void {
		this.hoveredIndex = null;
		// 모든 항목에서 'is-focused' 스타일을 제거 (원본 코드의 focusButton(undefined) 동작과 유사)
		// 단, 키보드로 선택된 activeIndex는 유지되도록 할 수도 있음.
		// 여기서는 원본 동작을 따라 모든 포커스 스타일을 일단 제거 후, 키보드 이동 시 다시 설정되도록 함.
		this.focusItem(undefined);
	}

	/**
	 * 특정 인덱스의 항목에 시각적 포커스를 적용하거나 모든 포커스를 해제합니다.
	 * @param index - 포커스할 항목의 인덱스. `undefined`인 경우 모든 항목의 포커스를 해제합니다.
	 */
	private focusItem(index?: number): void {
		// index가 undefined이면 -1로 설정해 모든 항목의 포커스를 해제합니다.
		index = index ?? -1;

		this.itemElements.forEach((el, i) => {
			if (i === index) {
				el.addClass("is-focused");
				// div 요소도 tabIndex가 있으면 포커스 가능
				el.focus();
			} else {
				el.removeClass("is-focused");
			}
		});
	}

	/**
	 * 특정 인덱스의 항목을 선택 처리합니다.
	 * 콜백 함수를 실행하고 모달을 닫습니다.
	 * @param index - 선택된 항목의 인덱스입니다.
	 */
	private selectItem(index: number): void {
		if (index >= 0 && index < this.items.length) {
			this.callback(this.items[index]); // 콜백 함수 실행
			this.close(); // 모달 닫기
		}
	}
}
