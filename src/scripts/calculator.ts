import { t, bindText, bindAttribute, clearTranslation, currentLanguage, formatCurrency, applyTranslations } from "../i18n/client";

    const priceCard = document.querySelector("[data-price-card]");

  if (priceCard instanceof HTMLElement) {
    const media = priceCard.querySelector("[data-price-media]");
    const stepContent = priceCard.querySelector(".prices-step-content");
    const label = priceCard.querySelector("[data-price-label]");
    const title = priceCard.querySelector("[data-price-title]");
    const copy = priceCard.querySelector("[data-price-copy]");
    const options = priceCard.querySelector("[data-price-options]");
    const surfaceStep = priceCard.querySelector("[data-price-surface-step]");
    const surfaceInput = priceCard.querySelector("[data-price-surface-input]");
    const surfaceError = priceCard.querySelector("[data-price-surface-error]");
    const supportOptions = priceCard.querySelector("[data-price-support-options]");
    const ceramicStep = priceCard.querySelector("[data-price-ceramic-step]");
    const conditionStep = priceCard.querySelector("[data-price-condition-step]");
    const resultStep = priceCard.querySelector("[data-price-result-step]");
    const resultSpace = priceCard.querySelector("[data-price-result-space]");
    const resultAmount = priceCard.querySelector("[data-price-result-amount]");
    const helpOpenButton = priceCard.querySelector("[data-price-help-open]");
    const conditionHelpOpenButton = priceCard.querySelector("[data-price-condition-help-open]");
    const helpOverlay = document.querySelector("[data-price-help-overlay]");
    const helpTitle = document.querySelector("[data-price-help-title]");
    const helpBody = document.querySelector("[data-price-help-body]");
    const action = priceCard.querySelector("[data-price-action]");
    const actionLabel = priceCard.querySelector("[data-price-action-label]");
    const backButton = priceCard.querySelector("[data-price-back]");
    const backLabel = backButton?.querySelector(".price-back-label");
    const progress = priceCard.querySelector("[data-price-progress]");
    const dots = priceCard.querySelectorAll("[data-price-dot]");
    const extraDot = priceCard.querySelector("[data-price-extra-dot]");
    const estimateCard = document.querySelector("[data-price-estimate]");
    const estimateAmount = document.querySelector("[data-price-estimate-amount]");
    const resultNameInput = priceCard.querySelector("[data-price-result-name]");
    const resultPhoneInput = priceCard.querySelector("[data-price-result-phone]");
    const resultSubmit = priceCard.querySelector("[data-price-result-submit]");
    const resultStatus = priceCard.querySelector("[data-price-result-status]");
    const directPanel = priceCard.querySelector("[data-price-direct-panel]");
    const directOpenButton = priceCard.querySelector("[data-price-direct-open]");
    const directForm = priceCard.querySelector("[data-price-direct-form]");
    const directCloseButton = priceCard.querySelector("[data-price-direct-close]");
    const directNameInput = priceCard.querySelector("[data-price-direct-name]");
    const directLastNameInput = priceCard.querySelector("[data-price-direct-last-name]");
    const directEmailInput = priceCard.querySelector("[data-price-direct-email]");
    const directPhoneInput = priceCard.querySelector("[data-price-direct-phone]");
    const directPhonePrefixSelect = priceCard.querySelector("[data-price-direct-phone-prefix-select]");
    const directPhonePrefixButton = priceCard.querySelector("[data-price-direct-phone-prefix-button]");
    const directPhonePrefixMenu = priceCard.querySelector("[data-price-direct-phone-prefix-menu]");
    const directPhonePrefixCurrent = priceCard.querySelector("[data-price-direct-phone-prefix-current]");
    const directPhonePrefixValue = priceCard.querySelector("[data-price-direct-phone-prefix-value]");
    const directMessageInput = priceCard.querySelector("[data-price-direct-message]");
    const directSubmit = priceCard.querySelector("[data-price-direct-submit]");
    const directStatus = priceCard.querySelector("[data-price-direct-status]");
    const storageKey = "myperol-price-calculator";
    const whatsappUrl = "https://wa.me/34663108027";
    let surfaceErrorTimeout = 0;
    let actionLabelTimeout = 0;
    let estimateTimeout = 0;
    let stepAnimationFrame = 0;
    let introModeTimeout = 0;
    const formatEuros = formatCurrency;
    const phonePrefixSelect = priceCard.querySelector("[data-phone-prefix-select]");
    const phonePrefixButton = priceCard.querySelector("[data-phone-prefix-button]");
    const phonePrefixMenu = priceCard.querySelector("[data-phone-prefix-menu]");
    const phonePrefixCurrent = priceCard.querySelector("[data-phone-prefix-current]");
    const phonePrefixValue = priceCard.querySelector("[data-phone-prefix-value]");
    const phonePrefixes = [
      ["ES", "+34"], ["FR", "+33"], ["DE", "+49"], ["GB", "+44"], ["UA", "+380"], ["RU", "+7"],
      ["AD", "+376"], ["AL", "+355"], ["AM", "+374"], ["AT", "+43"], ["BE", "+32"], ["BG", "+359"],
      ["CH", "+41"], ["CY", "+357"], ["CZ", "+420"], ["DK", "+45"], ["EE", "+372"], ["FI", "+358"],
      ["GR", "+30"], ["HR", "+385"], ["HU", "+36"], ["IE", "+353"], ["IS", "+354"], ["IT", "+39"],
      ["LT", "+370"], ["LU", "+352"], ["LV", "+371"], ["MC", "+377"], ["MD", "+373"], ["MT", "+356"],
      ["NL", "+31"], ["NO", "+47"], ["PL", "+48"], ["PT", "+351"], ["RO", "+40"], ["RS", "+381"],
      ["SE", "+46"], ["SI", "+386"], ["SK", "+421"], ["TR", "+90"],
      ["US", "+1"], ["CA", "+1"], ["MX", "+52"], ["AR", "+54"], ["BR", "+55"], ["CL", "+56"],
      ["CO", "+57"], ["CR", "+506"], ["CU", "+53"], ["DO", "+1"], ["EC", "+593"], ["PE", "+51"],
      ["UY", "+598"], ["VE", "+58"], ["PA", "+507"], ["PY", "+595"], ["BO", "+591"],
      ["AE", "+971"], ["CN", "+86"], ["HK", "+852"], ["ID", "+62"], ["IN", "+91"], ["IL", "+972"],
      ["JP", "+81"], ["KR", "+82"], ["MY", "+60"], ["PH", "+63"], ["SA", "+966"], ["SG", "+65"],
      ["TH", "+66"], ["VN", "+84"], ["AU", "+61"], ["NZ", "+64"],
      ["DZ", "+213"], ["EG", "+20"], ["GH", "+233"], ["KE", "+254"], ["MA", "+212"], ["NG", "+234"],
      ["SN", "+221"], ["ZA", "+27"], ["TN", "+216"],
    ];
    const getCountryFlag = (countryCode) => countryCode
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
    let countryNames: Intl.DisplayNames | undefined;
    const getCountryName = (countryCode) => {
      try {
        countryNames ||= new Intl.DisplayNames([currentLanguage()], { type: "region" });
        return countryNames.of(countryCode) || countryCode;
      } catch {
        return countryCode;
      }
    };

    const closePhonePrefixMenu = (menu = phonePrefixMenu, button = phonePrefixButton) => {
      if (menu instanceof HTMLElement) menu.hidden = true;
      if (button instanceof HTMLButtonElement) button.setAttribute("aria-expanded", "false");
    };

    const setPhonePrefix = (
      countryCode,
      code,
      {
        current = phonePrefixCurrent,
        value = phonePrefixValue,
        menu = phonePrefixMenu,
      } = {},
    ) => {
      const flag = getCountryFlag(countryCode);

      if (current) current.textContent = `${flag} ${code}`;
      if (value instanceof HTMLInputElement) value.value = code;

      menu?.querySelectorAll(".phone-prefix-option").forEach((option) => {
        if (option instanceof HTMLElement) {
          option.classList.toggle("is-selected", option.dataset.code === code && option.dataset.country === countryCode);
        }
      });
    };

    const createPhonePrefixMenu = ({ menu, current, value }) => {
      let isReady = false;

      return () => {
        if (isReady || !(menu instanceof HTMLElement)) return;

        const fragment = document.createDocumentFragment();
        phonePrefixes.forEach(([countryCode, code]) => {
          const flag = getCountryFlag(countryCode);
          const country = getCountryName(countryCode);
          const option = document.createElement("button");
          option.type = "button";
          option.className = "phone-prefix-option";
          option.dataset.code = code;
          option.dataset.country = countryCode;
          option.setAttribute("role", "option");
          option.innerHTML = `<span aria-hidden="true">${flag}</span><span class="phone-prefix-option-country">${country}</span><span class="phone-prefix-option-code">${code}</span>`;
          fragment.append(option);
        });
        menu.replaceChildren(fragment);
        isReady = true;

        const selectedCode = value instanceof HTMLInputElement ? value.value : "+34";
        const selected = phonePrefixes.find(([, code]) => code === selectedCode) || phonePrefixes[0];
        setPhonePrefix(selected[0], selected[1], { current, value, menu });
      };
    };

    const renderPhonePrefixes = createPhonePrefixMenu({
      menu: phonePrefixMenu,
      current: phonePrefixCurrent,
      value: phonePrefixValue,
    });
    const renderDirectPhonePrefixes = createPhonePrefixMenu({
      menu: directPhonePrefixMenu,
      current: directPhonePrefixCurrent,
      value: directPhonePrefixValue,
    });

    phonePrefixMenu?.addEventListener("click", (event) => {
      const option = event.target instanceof Element
        ? event.target.closest<HTMLElement>(".phone-prefix-option")
        : null;
      if (!option?.dataset.country || !option.dataset.code) return;
      setPhonePrefix(option.dataset.country, option.dataset.code);
      closePhonePrefixMenu();
    });

    directPhonePrefixMenu?.addEventListener("click", (event) => {
      const option = event.target instanceof Element
        ? event.target.closest<HTMLElement>(".phone-prefix-option")
        : null;
      if (!option?.dataset.country || !option.dataset.code) return;
      setPhonePrefix(option.dataset.country, option.dataset.code, {
        current: directPhonePrefixCurrent,
        value: directPhonePrefixValue,
        menu: directPhonePrefixMenu,
      });
      closePhonePrefixMenu(directPhonePrefixMenu, directPhonePrefixButton);
    });

    phonePrefixButton?.addEventListener("click", () => {
      if (!(phonePrefixMenu instanceof HTMLElement) || !(phonePrefixButton instanceof HTMLButtonElement)) return;

      const willOpen = phonePrefixMenu.hidden;
      if (willOpen) renderPhonePrefixes();
      phonePrefixMenu.hidden = !willOpen;
      phonePrefixButton.setAttribute("aria-expanded", String(willOpen));
    });

    directPhonePrefixButton?.addEventListener("click", () => {
      if (!(directPhonePrefixMenu instanceof HTMLElement) || !(directPhonePrefixButton instanceof HTMLButtonElement)) return;

      const willOpen = directPhonePrefixMenu.hidden;
      if (willOpen) renderDirectPhonePrefixes();
      directPhonePrefixMenu.hidden = !willOpen;
      directPhonePrefixButton.setAttribute("aria-expanded", String(willOpen));
    });

    document.addEventListener("click", (event) => {
      if (!(phonePrefixSelect instanceof HTMLElement)) return;
      if (event.target instanceof Node && !phonePrefixSelect.contains(event.target)) closePhonePrefixMenu();
      if (directPhonePrefixSelect instanceof HTMLElement && event.target instanceof Node && !directPhonePrefixSelect.contains(event.target)) {
        closePhonePrefixMenu(directPhonePrefixMenu, directPhonePrefixButton);
      }
    });

    const getState = () => ({
      step: priceCard.dataset.step || "1",
      selectedSpace: priceCard.dataset.selectedSpace || "",
      surface: surfaceInput instanceof HTMLInputElement ? surfaceInput.value : "",
      selectedSupport: priceCard.dataset.selectedSupport || "",
      selectedCeramicRemoval: priceCard.dataset.selectedCeramicRemoval || "",
      selectedCondition: priceCard.dataset.selectedCondition || "",
      estimatedPrice: priceCard.dataset.estimatedPrice || "",
    });

    let saveStateTimeout = 0;
    const saveState = () => {
      window.clearTimeout(saveStateTimeout);
      saveStateTimeout = 0;
      sessionStorage.setItem(storageKey, JSON.stringify(getState()));
    };

    // Validation stays synchronous; coalesce only the blocking storage write.
    const scheduleSaveState = () => {
      window.clearTimeout(saveStateTimeout);
      saveStateTimeout = window.setTimeout(saveState, 50);
    };
    const flushPendingState = () => {
      if (saveStateTimeout) saveState();
    };
    surfaceInput?.addEventListener("blur", flushPendingState);
    window.addEventListener("pagehide", flushPendingState);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushPendingState();
    });

    const animatePriceCardStep = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (priceCard.hidden) return;

      window.cancelAnimationFrame(stepAnimationFrame);
      priceCard.classList.remove("is-step-entering");

      stepAnimationFrame = window.requestAnimationFrame(() => {
        priceCard.classList.add("is-step-entering");
      });
    };

    priceCard.addEventListener("animationend", (event) => {
      if (event.animationName === "price-card-enter") {
        priceCard.classList.remove("is-step-entering");
      }
    });

    const updateBackButton = () => {
      if (backButton instanceof HTMLButtonElement) {
        const isResultStep = priceCard.dataset.step === "result";
        backButton.hidden = !isResultStep && Number(priceCard.dataset.step || "1") <= 1;
        bindAttribute(backButton, "aria-label", isResultStep ? "common_restart" : "common_back");
      }

      if (backLabel instanceof HTMLElement) {
        bindText(backLabel, priceCard.dataset.step === "result" ? "common_restart" : "common_back");
      }
    };

    const setActiveDots = (step) => {
      updateExtraProgressDot();

      const hasCeramicExtraStep = priceCard.dataset.selectedSupport === "ceramica-baldosa";
      const baseActiveStep = hasCeramicExtraStep && step >= 5
        ? (step >= 6 ? 5 : 4)
        : step;

      dots.forEach((dot, index) => {
        dot.classList.toggle("is-active", index < baseActiveStep);
      });

      if (progress) {
        const totalSteps = hasCeramicExtraStep ? 6 : 5;
        bindAttribute(progress, "aria-label", "calculator_progress", { step, total: totalSteps });
      }
    };

    const updateExtraProgressDot = () => {
      if (!(extraDot instanceof HTMLElement)) return;

      const shouldShowExtraDot = priceCard.dataset.selectedSupport === "ceramica-baldosa";
      extraDot.hidden = !shouldShowExtraDot;
      extraDot.classList.toggle("is-visible", shouldShowExtraDot);
      extraDot.classList.toggle("is-active", shouldShowExtraDot && Number(priceCard.dataset.step || "1") >= 5);
    };

    const setActionEnabled = (enabled) => {
      if (action instanceof HTMLButtonElement) action.disabled = !enabled;
    };

    const updateResultSubmitState = () => {
      if (!(resultSubmit instanceof HTMLButtonElement)) return;

      const hasName = resultNameInput instanceof HTMLInputElement && resultNameInput.value.trim().length > 0;
      const hasPhone = resultPhoneInput instanceof HTMLInputElement && resultPhoneInput.value.trim().length > 0;
      resultSubmit.disabled = !(hasName && hasPhone);
    };

    const setActionLabel = (key: string) => {
      const text = t(key);
      if (!actionLabel) return;

      window.clearTimeout(actionLabelTimeout);

      if (actionLabel.textContent === text) return;

      actionLabel.classList.add("is-changing");

      actionLabelTimeout = window.setTimeout(() => {
        bindText(actionLabel, key);
        actionLabel.classList.remove("is-changing");
      }, 120);
    };

    const updateSupportActionLabel = () => {
      setActionLabel(priceCard.dataset.step === "4" && priceCard.dataset.selectedSupport === "otro"
        ? "calculator_chat"
        : "calculator_continue");
    };

    const updateSelectedOption = (container, selectedValue, dataName) => {
      if (!(container instanceof HTMLElement)) return;

      container.querySelectorAll(".price-space-option").forEach((item) => {
        if (!(item instanceof HTMLButtonElement)) return;

        item.classList.toggle("is-selected", item.dataset[dataName] === selectedValue);
      });
    };

    const setBaseStepChromeHidden = (hidden) => {
      [media, label, title, copy].forEach((element) => {
        if (element instanceof HTMLElement) element.hidden = hidden;
      });
    };

    const setDirectContactMode = (enabled, { animate = true } = {}) => {
      window.clearTimeout(introModeTimeout);

      const updateMode = () => {
        priceCard.classList.toggle("is-direct-contact", enabled);
        if (directForm instanceof HTMLFormElement) directForm.hidden = !enabled;

        window.requestAnimationFrame(() => {
          if (stepContent instanceof HTMLElement) stepContent.classList.remove("is-view-switching");
          if (enabled && directNameInput instanceof HTMLInputElement) directNameInput.focus();
        });
      };

      if (!animate || !(stepContent instanceof HTMLElement)) {
        updateMode();
        return;
      }

      stepContent.classList.add("is-view-switching");
      introModeTimeout = window.setTimeout(updateMode, 150);
    };

    const configureStepColumns = (isIntro) => {
      if (directPanel instanceof HTMLElement) directPanel.hidden = !isIntro;
      if (isIntro && media instanceof HTMLElement) media.hidden = true;
      if (!isIntro) setDirectContactMode(false, { animate: false });
    };

    const spaceKeys = {
      "vivienda": "space_home", "garaje": "space_garage",
      "local-comercial": "space_business", "industria": "space_industry", "exterior": "space_outdoor",
    };
    const supportKeys = {
      "hormigon": "support_concrete", "mortero-autonivelante": "support_screed",
      "ceramica-baldosa": "support_tiles", "otro": "support_other",
    };
    const conditionKeys = {
      "excelente": "condition_excellent", "buen-estado": "condition_good",
      "pequenas-reparaciones": "condition_minor", "reparacion-importante": "condition_major",
    };
    const getSpaceKey = () => spaceKeys[priceCard.dataset.selectedSpace || "vivienda"] || "space_home";
    const getSpaceLabel = () => t(getSpaceKey());
    const getSupportLabel = () => t(supportKeys[priceCard.dataset.selectedSupport || ""] || "common_unselected");
    const getConditionLabel = () => t(conditionKeys[priceCard.dataset.selectedCondition || ""] || "common_unselected");
    const getCeramicRemovalLabel = () => {
      if (priceCard.dataset.selectedSupport !== "ceramica-baldosa") return t("common_not_applicable");
      return t(({ no: "ceramic_keep", si: "ceramic_remove" })[priceCard.dataset.selectedCeramicRemoval || ""] || "common_unselected");
    };

    const priceMultipliers = {
      space: {
        "vivienda": 1,
        "garaje": 1.06,
        "local-comercial": 1.10,
        "industria": 1.20,
        "exterior": 1.15,
      },
      condition: {
        "excelente": 1,
        "buen-estado": 1.1,
        "pequenas-reparaciones": 1.2,
        "reparacion-importante": 1.5,
      },
    };

    const getSupportMultiplier = () => {
      if (priceCard.dataset.selectedSupport !== "ceramica-baldosa") return 1;

      return priceCard.dataset.selectedCeramicRemoval === "si" ? 1.4 : 1;
    };

    const calculateEstimatedPrice = () => {
      const squareMeters = Number(surfaceInput instanceof HTMLInputElement ? surfaceInput.value : "0");

      if (!Number.isInteger(squareMeters) || squareMeters <= 0) return 0;

      const selectedSpace = priceCard.dataset.selectedSpace || "vivienda";
      const selectedCondition = priceCard.dataset.selectedCondition || "excelente";
      const spaceMultiplier = priceMultipliers.space[selectedSpace] ?? 1;
      const conditionMultiplier = priceMultipliers.condition[selectedCondition] ?? 1;

      return Math.round(squareMeters * 10 * spaceMultiplier * getSupportMultiplier() * conditionMultiplier);
    };

    const updateResultAmount = () => {
      const estimate = calculateEstimatedPrice();
      const lowerEstimate = Math.round(estimate * 0.9);
      const upperEstimate = Math.round(estimate * 1.1);

      priceCard.dataset.estimatedPrice = String(estimate);

      if (resultAmount) {
        bindText(resultAmount, "result_range", { min: formatEuros(lowerEstimate), max: formatEuros(upperEstimate) });
      }
    };

    const getResultRange = () => {
      const estimate = calculateEstimatedPrice();
      const lowerEstimate = Math.round(estimate * 0.9);
      const upperEstimate = Math.round(estimate * 1.1);

      return t("result_range", { min: formatEuros(lowerEstimate), max: formatEuros(upperEstimate) });
    };

    const getPriceRequestPayload = () => {
      const fullName = resultNameInput instanceof HTMLInputElement ? resultNameInput.value.trim() : "";
      const phone = resultPhoneInput instanceof HTMLInputElement ? resultPhoneInput.value.trim() : "";
      const prefix = phonePrefixValue instanceof HTMLInputElement ? phonePrefixValue.value : "";
      const squareMeters = surfaceInput instanceof HTMLInputElement ? surfaceInput.value.trim() : "";

      return {
        fullName,
        phone,
        phonePrefix: prefix,
        priceRange: getResultRange(),
        space: getSpaceLabel(),
        squareMeters,
        support: getSupportLabel(),
        ceramicRemoval: getCeramicRemovalLabel(),
        condition: getConditionLabel(),
      };
    };

    const setResultStatus = (key, type = "") => {
      if (!(resultStatus instanceof HTMLElement)) return;

      bindText(resultStatus, key);
      resultStatus.dataset.status = type;
    };

    const submitRequest = async (payload) => {
      const response = await fetch("/.netlify/functions/price-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.code === "MISSING_FIELDS" ? "request_missing" : "request_error");
      }
    };

    const submitPriceRequest = async () => {
      if (!(resultSubmit instanceof HTMLButtonElement) || resultSubmit.disabled) return;

      const payload = getPriceRequestPayload();
      if (!payload.fullName || !payload.phone) {
        updateResultSubmitState();
        return;
      }

      resultSubmit.disabled = true;
      resultSubmit.classList.add("is-loading");
      setResultStatus("request_sending", "loading");

      try {
        await submitRequest(payload);
        setResultStatus("request_success", "success");
      } catch (error) {
        setResultStatus(error instanceof Error && error.message === "request_missing" ? "request_missing" : "request_error", "error");
        updateResultSubmitState();
      } finally {
        resultSubmit.classList.remove("is-loading");
      }
    };

    const setDirectStatus = (key = "", type = "") => {
      if (!(directStatus instanceof HTMLElement)) return;

      if (key) bindText(directStatus, key);
      else directStatus.textContent = "";
      directStatus.dataset.status = type;
    };

    const submitDirectRequest = async () => {
      if (!(directForm instanceof HTMLFormElement) || !(directSubmit instanceof HTMLButtonElement)) return;
      if (!directForm.reportValidity()) return;

      const payload = {
        requestType: "direct-quote",
        fullName: [
          directNameInput instanceof HTMLInputElement ? directNameInput.value.trim() : "",
          directLastNameInput instanceof HTMLInputElement ? directLastNameInput.value.trim() : "",
        ].filter(Boolean).join(" "),
        email: directEmailInput instanceof HTMLInputElement ? directEmailInput.value.trim() : "",
        phonePrefix: directPhonePrefixValue instanceof HTMLInputElement ? directPhonePrefixValue.value : "",
        phone: directPhoneInput instanceof HTMLInputElement ? directPhoneInput.value.trim() : "",
        message: directMessageInput instanceof HTMLTextAreaElement ? directMessageInput.value.trim() : "",
      };

      directSubmit.disabled = true;
      directSubmit.classList.add("is-loading");
      setDirectStatus("request_sending", "loading");

      try {
        await submitRequest(payload);
        setDirectStatus("request_success", "success");
        directForm.reset();
      } catch (error) {
        setDirectStatus(error instanceof Error && error.message === "request_missing" ? "request_missing" : "request_error", "error");
      } finally {
        directSubmit.disabled = false;
        directSubmit.classList.remove("is-loading");
      }
    };

    const helpContent = {
      ceramic: { title: "help_ceramic_title", body: ["help_ceramic_one", "help_ceramic_two"] },
      condition: { title: "help_condition_title", body: ["help_condition_copy"] },
    };

    const openHelpModal = (contentType = "ceramic") => {
      const content = helpContent[contentType] || helpContent.ceramic;
      bindText(helpTitle, content.title);
      if (helpBody instanceof HTMLElement) {
        helpBody.replaceChildren(...content.body.map(key => {
          const paragraph = document.createElement("p");
          bindText(paragraph, key);
          return paragraph;
        }));
      }
      if (helpOverlay instanceof HTMLElement) {
        helpOverlay.hidden = false;
        window.requestAnimationFrame(() => helpOverlay.classList.add("is-open"));
      }
    };

    const closeHelpModal = () => {
      if (!(helpOverlay instanceof HTMLElement)) return;

      helpOverlay.classList.remove("is-open");
      window.setTimeout(() => {
        if (!helpOverlay.classList.contains("is-open")) helpOverlay.hidden = true;
      }, 160);
    };

    const resetStepScroll = () => {
      if (stepContent instanceof HTMLElement) stepContent.scrollTop = 0;
    };

    const setStepOne = ({ animate = false } = {}) => {
      priceCard.dataset.step = "1";
      priceCard.dataset.view = "intro";

      setBaseStepChromeHidden(false);
      configureStepColumns(true);
      setDirectContactMode(false, { animate: false });
      bindText(title, "calculator_title_intro");
      bindText(copy, "calculator_copy_intro");
      if (options instanceof HTMLElement) options.hidden = true;
      if (surfaceStep instanceof HTMLElement) surfaceStep.hidden = true;
      if (supportOptions instanceof HTMLElement) supportOptions.hidden = true;
      if (ceramicStep instanceof HTMLElement) ceramicStep.hidden = true;
      if (conditionStep instanceof HTMLElement) conditionStep.hidden = true;
      if (resultStep instanceof HTMLElement) resultStep.hidden = true;
      resetStepScroll();
      closeHelpModal();
      setActionLabel("calculator_start");

      setActiveDots(1);
      setActionEnabled(true);
      updateBackButton();
      if (animate) animatePriceCardStep();
      saveState();
    };

    const setStepTwo = ({ animate = false } = {}) => {
      priceCard.dataset.step = "2";
      priceCard.dataset.view = "space";

      setBaseStepChromeHidden(false);
      configureStepColumns(false);
      bindText(title, "calculator_title_space");
      clearTranslation(copy);
      if (options instanceof HTMLElement) options.hidden = false;
      if (surfaceStep instanceof HTMLElement) surfaceStep.hidden = true;
      if (supportOptions instanceof HTMLElement) supportOptions.hidden = true;
      if (ceramicStep instanceof HTMLElement) ceramicStep.hidden = true;
      if (conditionStep instanceof HTMLElement) conditionStep.hidden = true;
      if (resultStep instanceof HTMLElement) resultStep.hidden = true;
      resetStepScroll();
      closeHelpModal();
      setActionLabel("calculator_continue");

      setActiveDots(2);
      setActionEnabled(Boolean(priceCard.dataset.selectedSpace));
      updateBackButton();
      if (animate) animatePriceCardStep();
      saveState();
    };

    const setStepThree = ({ animate = false } = {}) => {
      priceCard.dataset.step = "3";
      priceCard.dataset.view = "surface";

      setBaseStepChromeHidden(false);
      configureStepColumns(false);
      bindText(title, "calculator_title_surface");
      clearTranslation(copy);
      if (options instanceof HTMLElement) options.hidden = true;
      if (surfaceStep instanceof HTMLElement) surfaceStep.hidden = false;
      if (supportOptions instanceof HTMLElement) supportOptions.hidden = true;
      if (ceramicStep instanceof HTMLElement) ceramicStep.hidden = true;
      if (conditionStep instanceof HTMLElement) conditionStep.hidden = true;
      if (resultStep instanceof HTMLElement) resultStep.hidden = true;
      resetStepScroll();
      closeHelpModal();
      if (animate && surfaceInput instanceof HTMLInputElement) surfaceInput.focus();
      setActionLabel("calculator_continue");

      setActiveDots(3);
      setActionEnabled(isValidSurfaceValue());
      updateBackButton();
      if (animate) animatePriceCardStep();
      saveState();
    };

    const setStepFour = ({ animate = false } = {}) => {
      priceCard.dataset.step = "4";
      priceCard.dataset.view = "support";

      setBaseStepChromeHidden(false);
      configureStepColumns(false);
      bindText(title, "calculator_title_support");
      clearTranslation(copy);
      if (options instanceof HTMLElement) options.hidden = true;
      if (surfaceStep instanceof HTMLElement) surfaceStep.hidden = true;
      if (supportOptions instanceof HTMLElement) supportOptions.hidden = false;
      if (ceramicStep instanceof HTMLElement) ceramicStep.hidden = true;
      if (conditionStep instanceof HTMLElement) conditionStep.hidden = true;
      if (resultStep instanceof HTMLElement) resultStep.hidden = true;
      resetStepScroll();
      closeHelpModal();

      setActiveDots(4);
      updateSupportActionLabel();
      setActionEnabled(Boolean(priceCard.dataset.selectedSupport));
      updateBackButton();
      if (animate) animatePriceCardStep();
      saveState();
    };

    const setStepFive = ({ animate = false } = {}) => {
      priceCard.dataset.step = "5";
      priceCard.dataset.view = "ceramic-removal";

      setBaseStepChromeHidden(false);
      configureStepColumns(false);
      bindText(title, "calculator_title_ceramic");
      clearTranslation(copy);
      if (options instanceof HTMLElement) options.hidden = true;
      if (surfaceStep instanceof HTMLElement) surfaceStep.hidden = true;
      if (supportOptions instanceof HTMLElement) supportOptions.hidden = true;
      if (ceramicStep instanceof HTMLElement) ceramicStep.hidden = false;
      if (conditionStep instanceof HTMLElement) conditionStep.hidden = true;
      if (resultStep instanceof HTMLElement) resultStep.hidden = true;
      resetStepScroll();
      setActionLabel("calculator_continue");

      setActiveDots(5);
      setActionEnabled(Boolean(priceCard.dataset.selectedCeramicRemoval));
      updateBackButton();
      if (animate) animatePriceCardStep();
      saveState();
    };

    const setConditionStep = ({ animate = false } = {}) => {
      priceCard.dataset.step = priceCard.dataset.selectedSupport === "ceramica-baldosa" ? "6" : "5";
      priceCard.dataset.view = "condition";

      setBaseStepChromeHidden(false);
      configureStepColumns(false);
      bindText(title, "calculator_title_condition");
      clearTranslation(copy);
      if (options instanceof HTMLElement) options.hidden = true;
      if (surfaceStep instanceof HTMLElement) surfaceStep.hidden = true;
      if (supportOptions instanceof HTMLElement) supportOptions.hidden = true;
      if (ceramicStep instanceof HTMLElement) ceramicStep.hidden = true;
      if (conditionStep instanceof HTMLElement) conditionStep.hidden = false;
      if (resultStep instanceof HTMLElement) resultStep.hidden = true;
      resetStepScroll();
      closeHelpModal();
      setActionLabel("calculator_finish");

      setActiveDots(Number(priceCard.dataset.step || "5"));
      setActionEnabled(Boolean(priceCard.dataset.selectedCondition));
      updateBackButton();
      if (animate) animatePriceCardStep();
      saveState();
    };

    const setResultStep = ({ animate = false } = {}) => {
      priceCard.dataset.step = "result";
      priceCard.dataset.view = "result";

      setBaseStepChromeHidden(true);
      configureStepColumns(false);
      if (options instanceof HTMLElement) options.hidden = true;
      if (surfaceStep instanceof HTMLElement) surfaceStep.hidden = true;
      if (supportOptions instanceof HTMLElement) supportOptions.hidden = true;
      if (ceramicStep instanceof HTMLElement) ceramicStep.hidden = true;
      if (conditionStep instanceof HTMLElement) conditionStep.hidden = true;
      if (resultStep instanceof HTMLElement) resultStep.hidden = false;
      resetStepScroll();
      bindText(resultSpace, getSpaceKey());
      applyTranslations(resultStep);
      updateResultAmount();
      updateResultSubmitState();
      closeHelpModal();

      updateBackButton();
      setActionLabel("calculator_start");
      setActionEnabled(true);
      if (animate) animatePriceCardStep();
      saveState();
    };

    const resetCalculator = () => {
      window.clearTimeout(estimateTimeout);
      sessionStorage.removeItem(storageKey);

      delete priceCard.dataset.selectedSpace;
      delete priceCard.dataset.selectedSupport;
      delete priceCard.dataset.selectedCeramicRemoval;
      delete priceCard.dataset.selectedCondition;
      delete priceCard.dataset.estimatedPrice;

      if (surfaceInput instanceof HTMLInputElement) {
        surfaceInput.value = "";
        surfaceInput.classList.remove("is-out-of-range");
      }

      if (surfaceError instanceof HTMLElement) surfaceError.hidden = true;
      updateSelectedOption(options, "", "space");
      updateSelectedOption(supportOptions, "", "support");
      updateSelectedOption(ceramicStep, "", "ceramicRemoval");
      updateSelectedOption(conditionStep, "", "condition");

      if (estimateCard instanceof HTMLElement) {
        estimateCard.classList.remove("is-visible");
        estimateCard.hidden = true;
      }

      priceCard.hidden = false;
      setStepOne({ animate: true });
      priceCard.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const runEstimateLoading = () => {
      window.clearTimeout(estimateTimeout);

      priceCard.hidden = true;

      if (estimateCard instanceof HTMLElement) {
        estimateCard.hidden = false;
        requestAnimationFrame(() => estimateCard.classList.add("is-visible"));
      }

      const estimateDuration = 2500;
      const frames = [130, 280, 420, 690, 930, 1180, 1410, 1600];
      const frameDuration = estimateDuration / frames.length;

      frames.forEach((value, index) => {
        window.setTimeout(() => {
          if (estimateAmount instanceof HTMLElement) {
            estimateAmount.dataset.amount = String(value);
            estimateAmount.textContent = formatEuros(value);
          }
        }, index * frameDuration);
      });

      estimateTimeout = window.setTimeout(() => {
        if (estimateCard instanceof HTMLElement) {
          estimateCard.classList.remove("is-visible");

          window.setTimeout(() => {
            estimateCard.hidden = true;
            priceCard.hidden = false;
            setResultStep();
          }, 160);
        } else {
          priceCard.hidden = false;
          setResultStep();
        }
      }, estimateDuration);
    };

    const isValidSurfaceValue = () => {
      if (!(surfaceInput instanceof HTMLInputElement)) return false;

      const value = Number(surfaceInput.value);
      return Number.isInteger(value) && value > 0 && value <= 9999999999;
    };

    const setSurfaceLimitError = (hasError) => {
      window.clearTimeout(surfaceErrorTimeout);

      if (surfaceInput instanceof HTMLInputElement) {
        surfaceInput.classList.toggle("is-out-of-range", hasError);
      }

      if (surfaceError instanceof HTMLElement) {
        surfaceError.hidden = !hasError;
      }

      if (hasError) {
        surfaceErrorTimeout = window.setTimeout(() => {
          if (surfaceInput instanceof HTMLInputElement) {
            surfaceInput.classList.remove("is-out-of-range");
          }

          if (surfaceError instanceof HTMLElement) {
            surfaceError.hidden = true;
          }
        }, 2000);
      }
    };

    directOpenButton?.addEventListener("click", () => {
      if (priceCard.dataset.step !== "1") return;
      setDirectStatus();
      setDirectContactMode(true);
    });

    directCloseButton?.addEventListener("click", () => {
      setDirectStatus();
      setDirectContactMode(false);
    });

    directForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitDirectRequest();
    });

    action?.addEventListener("click", () => {
      if (priceCard.dataset.step === "1") {
        setStepTwo({ animate: true });
        return;
      }

      if (priceCard.dataset.step === "2") {
        setStepThree({ animate: true });
        return;
      }

      if (priceCard.dataset.step === "3" && isValidSurfaceValue()) {
        setStepFour({ animate: true });
        return;
      }

      if (priceCard.dataset.step === "4" && priceCard.dataset.selectedSupport === "otro") {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (priceCard.dataset.step === "4" && priceCard.dataset.selectedSupport === "ceramica-baldosa") {
        setStepFive({ animate: true });
        return;
      }

      if (priceCard.dataset.step === "4" && (
        priceCard.dataset.selectedSupport === "hormigon" ||
        priceCard.dataset.selectedSupport === "mortero-autonivelante"
      )) {
        setConditionStep({ animate: true });
        return;
      }

      if (priceCard.dataset.step === "5" && priceCard.dataset.selectedSupport === "ceramica-baldosa" && priceCard.dataset.selectedCeramicRemoval) {
        setConditionStep({ animate: true });
        return;
      }

      if ((priceCard.dataset.step === "5" || priceCard.dataset.step === "6") && priceCard.dataset.view === "condition" && priceCard.dataset.selectedCondition) {
        runEstimateLoading();
      }
    });

    backButton?.addEventListener("click", () => {
      if (priceCard.dataset.step === "result") {
        resetCalculator();
        return;
      }

      const currentStep = Number(priceCard.dataset.step || "1");

      if (currentStep === 6) {
        setStepFive({ animate: true });
        return;
      }

      if (currentStep === 5) {
        if (priceCard.dataset.selectedSupport !== "ceramica-baldosa") {
          setStepFour({ animate: true });
          return;
        }

        setStepFour({ animate: true });
        return;
      }

      if (currentStep === 4) {
        setStepThree({ animate: true });
        return;
      }

      if (currentStep === 3) {
        setStepTwo({ animate: true });
        return;
      }

      if (currentStep === 2) {
        setStepOne({ animate: true });
      }
    });

    options?.querySelectorAll(".price-space-option").forEach((option) => {
      option.addEventListener("click", () => {
        if (!(option instanceof HTMLButtonElement)) return;

        priceCard.dataset.selectedSpace = option.dataset.space || "";
        updateSelectedOption(options, priceCard.dataset.selectedSpace, "space");

        setActionEnabled(true);
        saveState();
      });
    });

    supportOptions?.querySelectorAll(".price-space-option").forEach((option) => {
      option.addEventListener("click", () => {
        if (!(option instanceof HTMLButtonElement)) return;

        priceCard.dataset.selectedSupport = option.dataset.support || "";
        updateSelectedOption(supportOptions, priceCard.dataset.selectedSupport, "support");

        if (priceCard.dataset.selectedSupport !== "ceramica-baldosa") {
          delete priceCard.dataset.selectedCeramicRemoval;
          updateSelectedOption(ceramicStep, "", "ceramicRemoval");
        }

        delete priceCard.dataset.selectedCondition;
        updateSelectedOption(conditionStep, "", "condition");

        updateExtraProgressDot();
        setActiveDots(Number(priceCard.dataset.step || "4"));
        updateSupportActionLabel();
        setActionEnabled(true);
        saveState();
      });
    });

    ceramicStep?.querySelectorAll(".price-space-option").forEach((option) => {
      option.addEventListener("click", () => {
        if (!(option instanceof HTMLButtonElement)) return;

        priceCard.dataset.selectedCeramicRemoval = option.dataset.ceramicRemoval || "";
        updateSelectedOption(ceramicStep, priceCard.dataset.selectedCeramicRemoval, "ceramicRemoval");

        setActionEnabled(true);
        saveState();
      });
    });

    conditionStep?.querySelectorAll(".price-space-option").forEach((option) => {
      option.addEventListener("click", () => {
        if (!(option instanceof HTMLButtonElement)) return;

        priceCard.dataset.selectedCondition = option.dataset.condition || "";
        updateSelectedOption(conditionStep, priceCard.dataset.selectedCondition, "condition");

        setActionEnabled(true);
        saveState();
      });
    });

    helpOpenButton?.addEventListener("click", () => openHelpModal("ceramic"));
    conditionHelpOpenButton?.addEventListener("click", () => openHelpModal("condition"));

    helpOverlay?.addEventListener("click", (event) => {
      if (event.target === helpOverlay) closeHelpModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeHelpModal();
        closePhonePrefixMenu();
        if (priceCard.classList.contains("is-direct-contact")) setDirectContactMode(false);
      }
    });

    surfaceInput?.addEventListener("input", () => {
      if (!(surfaceInput instanceof HTMLInputElement)) return;

      const numericValue = surfaceInput.value.replace(/\D/g, "");
      const isOutOfRange = numericValue.length > 10 || Number(numericValue) > 9999999999;

      surfaceInput.value = numericValue.slice(0, 10);
      setSurfaceLimitError(isOutOfRange);
      setActionEnabled(isValidSurfaceValue());
      scheduleSaveState();
    });

    resultNameInput?.addEventListener("input", updateResultSubmitState);
    resultPhoneInput?.addEventListener("input", updateResultSubmitState);

    resultSubmit?.addEventListener("click", () => {
      submitPriceRequest();
    });

    const restoreState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const requestedReset = urlParams.get("reset") === "1";
        const requestedSpace = urlParams.get("space") || "";
        const validSpaces = ["vivienda", "garaje", "local-comercial", "industria", "exterior"];

        if (requestedReset) {
          sessionStorage.removeItem(storageKey);

          if (validSpaces.includes(requestedSpace)) {
            priceCard.dataset.selectedSpace = requestedSpace;
            updateSelectedOption(options, requestedSpace, "space");
          }

          setStepOne({ animate: true });
          return;
        }

        const storedState = JSON.parse(sessionStorage.getItem(storageKey) || "{}");

        if (typeof storedState.selectedSpace === "string") {
          priceCard.dataset.selectedSpace = storedState.selectedSpace;
          updateSelectedOption(options, storedState.selectedSpace, "space");
        }

        if (surfaceInput instanceof HTMLInputElement && typeof storedState.surface === "string") {
          surfaceInput.value = storedState.surface.replace(/\D/g, "").slice(0, 10);
        }

        if (typeof storedState.selectedSupport === "string") {
          priceCard.dataset.selectedSupport = storedState.selectedSupport;
          updateSelectedOption(supportOptions, storedState.selectedSupport, "support");
          updateExtraProgressDot();
        }

        if (typeof storedState.selectedCeramicRemoval === "string") {
          priceCard.dataset.selectedCeramicRemoval = storedState.selectedCeramicRemoval;
          updateSelectedOption(ceramicStep, storedState.selectedCeramicRemoval, "ceramicRemoval");
        }

        if (typeof storedState.selectedCondition === "string") {
          priceCard.dataset.selectedCondition = storedState.selectedCondition;
          updateSelectedOption(conditionStep, storedState.selectedCondition, "condition");
        }

        if (storedState.step === "result") {
          setResultStep({ animate: true });
          return;
        }

        const restoredStep = Number(storedState.step || 1);

        if (restoredStep >= 6 && priceCard.dataset.selectedSupport === "ceramica-baldosa") {
          setConditionStep({ animate: true });
          return;
        }

        if (restoredStep >= 5 && priceCard.dataset.selectedSupport === "ceramica-baldosa") {
          setStepFive({ animate: true });
          return;
        }

        if (restoredStep >= 5) {
          setConditionStep({ animate: true });
          return;
        }

        if (restoredStep >= 4) {
          setStepFour({ animate: true });
          return;
        }

        if (restoredStep === 3) {
          setStepThree({ animate: true });
          return;
        }

        if (restoredStep === 2) {
          setStepTwo({ animate: true });
          return;
        }
      } catch {
        sessionStorage.removeItem(storageKey);
      }

      setStepOne({ animate: true });
    };

    window.addEventListener("i18n:updated", () => {
      countryNames = undefined;
      [phonePrefixMenu, directPhonePrefixMenu].forEach((menu) => {
        menu?.querySelectorAll<HTMLElement>(".phone-prefix-option").forEach(option => {
          const country = option.querySelector(".phone-prefix-option-country");
          if (country) country.textContent = getCountryName(option.dataset.country);
        });
      });
      if (priceCard.dataset.view === "result") {
        bindText(resultSpace, getSpaceKey());
        updateResultAmount();
      }
      if (estimateAmount instanceof HTMLElement) {
        estimateAmount.textContent = formatEuros(Number(estimateAmount.dataset.amount || 130));
      }
    });

    restoreState();
  }
