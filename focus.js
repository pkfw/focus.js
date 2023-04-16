/*
 * =====================================================================
 * 작 업 명  : 포커싱 핸들러
 * 파 일 명  : focus.js
 * 변경이력
 * 2023-03-21 / soboti / 최초작성
 * =====================================================================
 */

var focusHandler = {
	// 최초 실행
	init: () => {
		top.focusHandler.setDefaultData();
		top.focusHandler.setTabindexAll();
	},

	// 초기데이터 설정 : window.top(webview) 에 변수 및 초기값 할당
	setDefaultData: () => {
		const defaultValues = {
			// tabindex 시작번호
			start_tabindex_menu: 0,
			start_tabindex_content: 10000,
			start_tabindex_modal: 20000,
			// tabindex 현재번호
			current_tabindex_menu: 0,
			current_tabindex_content: 0,
			current_tabindex_modal: 0,
			// 현재 뎁스?
			current_depth: 0,
			current_type: 'unknown', // menu, content, modal
			current_iframe_type: 'main', // main, content, map
		};

		// 변수 존재여부 확인 후, 없으면 초기값 할당.
		Object.keys(defaultValues).forEach((key) => {
			if (typeof top[key] === 'undefined') {
				top[key] = defaultValues[key];
			}
		});
	},

	// Tabindex 설정
	setTabindexAll: () => {
		top.focusHandler.setTabindex('menu');
		top.focusHandler.setTabindex('content');
		top.focusHandler.setTabindex('modal');
	},
	setTabindex: (type) => {
		// type : menu, content, modal
		let index = top[`start_tabindex_${type}`];
		const elements = top.focusHandler.getCurrentDocument().querySelectorAll(`[data-tab-${type}]`);

		elements.forEach((element) => {
			const isVisible = top.focusHandler.isElementVisible(element);
			!isVisible && element.removeAttribute('tabindex');
			isVisible && element.setAttribute('tabindex', index++);
		});
	},

	// 현재 엘리먼트가 숨김처리되어있는지 확인
	isElementVisible: (element) => {
		return element.offsetWidth > 0 && element.offsetHeight > 0;
	},

	// 디폴트값 기준으로 초기 포커싱 잡아주기
	setStartFocus: (type) => {
		// type : menu, content, modal
		const tabindex = top[`start_tabindex_${type}`];
		top.focusHandler.findElement(tabindex).focus();
	},

	// 다시 포커싱 처리
	reFocus: () => {
		const type = top['current_type'];
		const pageHandler = JSON.parse( localStorage.getItem( 'pageHandler' ) );
		const tabindex = pageHandler[pageHandler.length - 1][`current_tabindex_${type}`];
		const iframeType = pageHandler[pageHandler.length - 1].current_iframe_type;
		if (top.focusHandler.getDepth() > 0 && iframeType != 'main') {
			top.focusHandler.setIframeFocus(iframeType);
		}
		top.focusHandler.findElement(tabindex).focus();
	},

	// tabindex 이동
	move: (keyType) => {
		const step = keyType === 'left' ? -1 : keyType === 'right' ? 1 : 0;

		const currentIndex = top.focusHandler.getCurrentTabindexNo();
		const type = top.focusHandler.getFocusType(currentIndex);
		const nextIndex = currentIndex + step;
		let nextElement = top.focusHandler.findElement(nextIndex);

		const maxTabindex = top.focusHandler.getTabindexMaxOrMin('max');
		let minTabindex = top.focusHandler.getTabindexMaxOrMin('min');

		// 메인 메뉴일 경우, 마지막 tabindex에서 움직일 경우, 첫번쨰 tabindex로 이동하도록 처리.
		if (!nextElement && type === 'menu') {
			const targetIndex = keyType === 'left' ? maxTabindex
							  : keyType === 'right' ? minTabindex
													: nextIndex;
			nextElement = top.focusHandler.findElement(targetIndex);
		} else if (nextElement) {
			// 다음 tabindex가 있어도, 최대tabindex로 가져온 값까지만 이동하도록 지정.
			if (type === 'menu') {
				if ( keyType === 'right' && maxTabindex < nextElement.getAttribute('tabindex') ) {
					nextElement = top.focusHandler.findElement(minTabindex);
				} else if ( keyType === 'left' && minTabindex > nextElement.getAttribute('tabindex') ) {
					nextElement = top.focusHandler.findElement(maxTabindex);
				}
			}
		} else {
			// 아무것도 없다면 포커싱 이동하지 않음
			return;
		}

		nextElement.focus();
		top.focusHandler.setCurrentIframeType();
		top.focusHandler.setFocusDataToTop( nextElement.getAttribute('tabindex'), currentIndex, type );
		top.focusHandler.setFocusDataToLocalStorage();
	},

	// 현재 포커싱되어있는 메뉴 타입 확인
	getFocusType: (tabindex) => {
		switch (true) {
			case tabindex >= window.start_tabindex_menu && tabindex <= 9999:
				return 'menu';
			case tabindex >= window.start_tabindex_content && tabindex <= 19999:
				return 'content';
			case tabindex >= window.start_tabindex_modal:
				return 'modal';
			default:
				return 'unknown';
		}
	},

	getLastLocalStorageTabindex: (type) => {
		// type : menu, content, modal
		if (!type) {
			type = 'menu';
		}
		const pageHandler = top.storeHandler.getData('pageHandler');
		const tabindex = pageHandler[pageHandler.length - 1][`current_tabindex_${type}`];
		return tabindex;
	},

	// 현재 포커싱되어있는 엘리먼트 tabindex 번호 가져오기
	getCurrentTabindexNo: () => {
		return parseInt(
			top.focusHandler.getCurrentElement().getAttribute('tabindex')
		);
	},

	getCurrentElement: () => {
		return top.focusHandler.getCurrentDocument().activeElement;
	},

	// 현재 포커싱된 document 객체 찾아주기
	getCurrentDocument: () => {
		if (document.activeElement.tagName == 'IFRAME') {
			return document.activeElement.contentDocument;
		} else {
			return document;
		}
	},

	// 현재 포커싱된 window 객체 찾아주기
	getCurrentWindow: () => {
		if (document.activeElement.tagName == 'IFRAME') {
			return document.activeElement.contentWindow;
		} else {
			return top.window;
		}
	},

	// 파라미터값으로 tabindex 번호를 주면 해당 값이 담겨있는 탭인덱스 찾기
	findElement: (idx) => {
		return top.focusHandler
			.getCurrentDocument()
			.querySelector(`[tabindex="${idx}"]`);
	},

	// 포커싱된 태그가 속한 조상요소로 올라가, tabindex가 담겨있는 태그 중에서 최대값/최소값 찾기
	getTabindexMaxOrMin: (type) => {
		let grandParentElement;
		const checkTag = top.focusHandler.getCurrentElement();
		const parentTag = checkTag.parentElement.classList;

		if (checkTag.tagName == 'BODY') {
			grandParentElement = top.focusHandler.getCurrentElement();
		} else if (
			parentTag.contains('languages') ||
			parentTag.contains('floor_box')
		) {
			grandParentElement =
				top.focusHandler.getCurrentElement().parentElement;
		} else {
			grandParentElement =
				top.focusHandler.getCurrentElement().parentElement
					.parentElement;
		}

		const elements = grandParentElement.querySelectorAll('*[tabindex]');
		const tabIndexes = Array.from(elements).map((el) =>
			parseInt(el.getAttribute('tabindex'))
		);
		return type === 'min'
			? Math.min(...tabIndexes)
			: Math.max(...tabIndexes);
	},

	// 태그 포커싱 데이터 저장
	setFocusDataToTop: (nextIndex, currentIndex, type) => {
		top[`before_tabindex_${type}`] = currentIndex;
		top[`current_tabindex_${type}`] = nextIndex;
		top[`current_type`] = type;
	},

	setFocusDataToLocalStorage: () => {
		const pageHandler = {
			// tabindex 현재번호
			current_tabindex_menu: parseInt(top.current_tabindex_menu),
			current_tabindex_content: parseInt(top.current_tabindex_content),
			current_tabindex_modal: parseInt(top.current_tabindex_modal),
			// tabindex 이전번호
			before_tabindex_menu: top.before_tabindex_menu,
			before_tabindex_content: top.before_tabindex_content,
			before_tabindex_modal: top.before_tabindex_modal,
			// 현재 depth
			// current_depth: top.current_depth,
			current_iframe_type: top.current_iframe_type,
		};

		const depth = top.current_depth;
		let data = top.storeHandler.getData('pageHandler');
		if (!data) {
			// 로컬스토리지에 데이터가 없다면 배열 형태로 생성
			data = [pageHandler];
		} else {
			// 로컬 스토리지에 데이터가 있을 경우
			let lastIndex = data.length - 1; // 마지막 인덱스값 구하기.

			if (lastIndex == depth) {
				// 마지막 인덱스값과 현재 뎁스가 일치할 경우,
				data[lastIndex] = pageHandler; // 마지막 인덱스 데이터를 현재 생성한 데이터로 치환.
			} else if (lastIndex > depth) {
				// 마지막 인덱스값이 현재 뎁스보다 클 경우
				while (lastIndex >= depth) {
					// 마지막 인덱스값이 현재 뎁스보다 작을 때까지 반복.
					data.pop(); // 마지막 배열 제거
					lastIndex = data.length - 1; // 마지막 인덱스값 다시 구해서 변수에 저장
				}
				data.push(pageHandler); // 데이터를 배열형태로 맨 마지막 배열 뒤에 추가.
			} else {
				// 마지막 인덱스값이 현재 뎁스랑 같을 경우(나머지일 경우)
				data.push(pageHandler); // 데이터를 배열형태로 맨 마지막 배열 뒤에 추가.
			}
		}
		top.storeHandler.setData('pageHandler', data);
	},

	activeOnClick: () => {
		top.storeHandler.setData('action.type', 'enter');
		top.focusHandler.getCurrentElement().click();
		top.lastActionTime = top.moment();
	},

	setDepth: (keyType) => {
		// keyType : enter, backspace
		// 현재뎁스가 0 인데, 백스페이스 눌렀을 경우 동작 안함.
		if (top.current_depth == 0 && keyType === 'backspace') return;

		const step = keyType === 'backspace' ? -1 : keyType === 'enter' ? 1 : 0;
		top.current_depth = top.current_depth + step;

		// focusHandler.setCurrentIframeType()

		if (keyType == 'backspace') {
			const data = storeHandler.getData('pageHandler');
			const lastIndex = data[data.length - 2];
			top.current_tabindex_menu = lastIndex
				? lastIndex.current_tabindex_menu
				: 0;
		} else {
			top.current_tabindex_menu = 0;
		}
		top.current_tabindex_content = 0;
		top.current_tabindex_modal = 0;
		top.before_tabindex_menu = parseInt(top.current_tabindex_menu);
		top.before_tabindex_content = parseInt(top.current_tabindex_content);
		top.before_tabindex_modal = parseInt(top.current_tabindex_modal);
		top.current_iframe_type = focusHandler.getCurrentIframeType();

		top.focusHandler.setFocusDataToLocalStorage();
	},
	getDepth: () => {
		return top.current_depth;
	},
	setDefaultDepth: () => {
		const pageHandler = {
			// tabindex 현재번호
			current_tabindex_menu: 0,
			current_tabindex_content: 0,
			current_tabindex_modal: 0,
			// tabindex 이전번호
			before_tabindex_menu: 0,
			before_tabindex_content: 0,
			before_tabindex_modal: 0,
			// 현재 depth
			// current_depth: top.current_depth,
			// 현재 iframe type
			current_iframe_type: 'main',
		};
		let data = [pageHandler];
		top.current_depth = 0;
		top.storeHandler.setData('pageHandler', data);
	},
	setIframeFocus: (type) => {
		// type : content, map
		const iframeId = type === 'content' ? 'iframe_content' : 'iframe_map';
		const iframe = top.document.getElementById(iframeId);
		if (iframe && iframe.contentWindow) {
			// top.focusHandler.getCurrentElement().blur();
			iframe.contentWindow.focus();
		}
	},
	removeIframeFocus: () => {
		top.focus();
	},

	// tabindex type 설정
	setCurrentType: (type) => {
		top.current_type = type;
	},

	getCurrentType: () => {
		return top.current_type;
	},

	// iframe type 설정
	setCurrentIframeType: (type) => {
		top.current_iframe_type = type;
	},

	getCurrentIframeType: () => {
		return top.current_iframe_type;
	},
};
