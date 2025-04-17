// ==UserScript==
// @name            Limpar cores invisible-able no Kiwify
// @namespace       https://www.kiwify.com.br
// @version         1.0
// @description     Limpa cores que podem tornar o texto invisível
// @author          Ivens de Alvarenga
// @match           https://dashboard.kiwify.com.br/members-area/*
// @grant           none
// @run-at          document-end
// @downloadURL     https://raw.githubusercontent.com/alvarengi/clean-unsafe-colors-kiwify/main/clean-unsafe-colors-kiwify.js
// @updateURL       https://raw.githubusercontent.com/alvarengi/clean-unsafe-colors-kiwify/main/clean-unsafe-colors-kiwify.js
// ==/UserScript==

console.log("[lcpdw-kiwify] Script injetado!");

(function () {
	"use strict";

	const CONFIG = {
		UNSAFE_COLORS: new Set(["#000000", "#000", "#ffffff", "#fff"]),
		BUTTON_STYLE: {
			POSITION: { top: "15px", right: "20px" },
			STYLES: `
                position: absolute;
                z-index: 1000;
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 6px 12px;
                font-family: system-ui;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            `,
		},
	};

	const ColorNormalizer = {
		tempCanvas: document.createElement("canvas").getContext("2d"),

		normalize(color) {
			console.log("[lcpdw-kiwify] Normalizando cor...");
			this.tempCanvas.fillStyle = color;
			return this.tempCanvas.fillStyle.toLowerCase();
		},

		isUnsafe(color) {
			console.log("[lcpdw-kiwify] Verificando se a cor é segura...");
			if (!color) return false;
			return CONFIG.UNSAFE_COLORS.has(this.normalize(color));
		},
	};

	const StyleCleaner = {
		cleanElement(element) {
			const style = element.style;

			// Limpa cor do texto
			if (ColorNormalizer.isUnsafe(style.color)) {
				console.log(
					"[lcpdw-kiwify] Cor de fonte insegura detectada. Removendo..."
				);
				style.removeProperty("color");
			}

			// Limpa cor de fundo
			if (ColorNormalizer.isUnsafe(style.backgroundColor)) {
				console.log(
					"[lcpdw-kiwify] Cor de fundo insegura detectada. Removendo..."
				);
				style.removeProperty("background-color");
			}
		},

		cleanHTMLContent(html) {
			console.log("[lcpdw-kiwify] Limpando HTML do conteúdo...");
			console.log(
				"[lcpdw-kiwify] Transformando HTML do conteúdo em elementos processáveis..."
			);
			const doc = new DOMParser().parseFromString(html, "text/html");
			doc.body.querySelectorAll("*").forEach((element) => {
				console.log("[lcpdw-kiwify] Limpando elementos...");
				this.cleanElement(element);
				// this.sanitizeAttributes(element);
			});
			console.log("[lcpdw-kiwify] HTML limpo com sucesso!");
			return doc.body.innerHTML;
		},

		sanitizeAttributes(element) {
			console.log("[lcpdw-kiwify] Sanitizando atributos...");
			// Mantém atributos essenciais
			const allowed = ["href", "src", "alt", "title", "target"];
			Array.from(element.attributes).forEach((attr) => {
				if (!allowed.includes(attr.name)) element.removeAttribute(attr.name);
			});
		},
	};

	const RedactorManager = {
		get container() {
			return getFirstVisibleElement(".redactor-box");
		},

		get visualEditor() {
			return this.container?.querySelector(".redactor-styles");
		},

		get sourceEditor() {
			return this.container?.querySelector(".redactor-source");
		},

		cleanContent() {
			console.log("[lcpdw-kiwify] Vamos limpar o conteúdo!");
			this.cleanVisualEditor();
			this.cleanSourceEditor();
		},

		cleanVisualEditor() {
			if (this.visualEditor) {
				console.log("[lcpdw-kiwify] Limpando através do editor visual...");
				this.visualEditor.querySelectorAll("*").forEach((element) => {
					StyleCleaner.cleanElement(element);
				});
			}
		},

		cleanSourceEditor() {
			if (this.sourceEditor) {
				console.log(
					"[lcpdw-kiwify] Limpando através do editor de código fonte..."
				);
				this.sourceEditor.value = StyleCleaner.cleanHTMLContent(
					this.sourceEditor.value
				);
			}
		},
	};

	const ButtonController = {
		init() {
			if (!this.shouldCreateButton()) return;

			console.log("[lcpdw-kiwify] Preparando para injeção do botão...");

			const button = this.createButton();
			button.addEventListener("click", () => RedactorManager.cleanContent());

			RedactorManager.container.style.position = "relative";

			console.log("[lcpdw-kiwify] Injetando botão...");
			RedactorManager.container.appendChild(button);
		},

		shouldCreateButton() {
			return (
				RedactorManager.container && !document.getElementById("safeColorBtn")
			);
		},

		createButton() {
			console.log("[lcpdw-kiwify] Criando botão...");
			const button = document.createElement("button");
			button.id = "safeColorBtn";
			button.textContent = "🧹";
			button.style.cssText = `
                ${CONFIG.BUTTON_STYLE.STYLES}
                top: ${CONFIG.BUTTON_STYLE.POSITION.top};
                right: ${CONFIG.BUTTON_STYLE.POSITION.right};
            `;

			return button;
		},
	};

	// Inicialização
	new MutationObserver(() => ButtonController.init()).observe(document.body, {
		childList: true,
		subtree: true,
	});

	setTimeout(() => ButtonController.init(), 2000);

	// Funções utilitárias pra busca de elementos

	function getFirstVisibleElement(selector) {
		const elements = document.querySelectorAll(selector); // Seleciona todos os elementos com o seletor
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			if (isElementVisible(element)) {
				return element; // Retorna o primeiro elemento visível encontrado
			}
		}
		return null; // Caso não haja elementos visíveis
	}

	function isElementVisible(element) {
		if (!element) return false;

		const rect = element.getBoundingClientRect();

		// Verifica se o elemento tem `display: none`, `visibility: hidden`, `opacity: 0`
		const style = window.getComputedStyle(element);
		const isNotHidden =
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			style.opacity !== "0";

		// Verifica se o elemento e seus pais são visíveis
		return isNotHidden && areAllParentsVisible(element);
	}

	function areAllParentsVisible(element) {
		let parent = element.parentElement;

		// Itera sobre todos os pais até o topo da árvore DOM
		while (parent) {
			const style = window.getComputedStyle(parent);
			// Se algum pai tiver display 'none' ou visibility 'hidden', o elemento não está visível
			if (
				style.display === "none" ||
				style.visibility === "hidden" ||
				style.opacity === "0"
			) {
				return false;
			}
			parent = parent.parentElement; // Vai para o próximo pai
		}
		return true; // Se nenhum dos pais tiver 'display: none' ou 'visibility: hidden', o elemento é visível
	}
})();
