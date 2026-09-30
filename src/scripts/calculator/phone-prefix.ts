const PHONE_PREFIXES = [
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
] as const;

interface PhonePrefixElements {
  select: Element | null;
  button: Element | null;
  menu: Element | null;
  current: Element | null;
  value: Element | null;
}

interface PhonePrefixControl extends PhonePrefixElements {
  ready: boolean;
}

const getCountryFlag = (countryCode: string) => countryCode
  .toUpperCase()
  .replace(/./g, character => String.fromCodePoint(127397 + character.charCodeAt(0)));

const createOption = (countryCode: string, code: string, countryName: string) => {
  const option = document.createElement("button");
  option.type = "button";
  option.className = "phone-prefix-option";
  option.dataset.code = code;
  option.dataset.country = countryCode;
  option.setAttribute("role", "option");

  const flag = document.createElement("span");
  flag.setAttribute("aria-hidden", "true");
  flag.textContent = getCountryFlag(countryCode);

  const country = document.createElement("span");
  country.className = "phone-prefix-option-country";
  country.textContent = countryName;

  const prefix = document.createElement("span");
  prefix.className = "phone-prefix-option-code";
  prefix.textContent = code;

  option.append(flag, country, prefix);
  return option;
};

export function createPhonePrefixControls(
  elementGroups: PhonePrefixElements[],
  getLanguage: () => string,
) {
  const controls: PhonePrefixControl[] = elementGroups.map(elements => ({ ...elements, ready: false }));
  const listeners = new AbortController();
  const { signal } = listeners;
  let countryNames: Intl.DisplayNames | undefined;

  const getCountryName = (countryCode: string) => {
    try {
      countryNames ||= new Intl.DisplayNames([getLanguage()], { type: "region" });
      return countryNames.of(countryCode) || countryCode;
    } catch {
      return countryCode;
    }
  };

  const close = ({ menu, button }: PhonePrefixControl) => {
    if (menu instanceof HTMLElement && !menu.hidden) menu.hidden = true;
    if (button instanceof HTMLButtonElement && button.getAttribute("aria-expanded") !== "false") {
      button.setAttribute("aria-expanded", "false");
    }
  };

  const select = (control: PhonePrefixControl, countryCode: string, code: string) => {
    const { current, value, menu } = control;
    if (current) current.textContent = `${getCountryFlag(countryCode)} ${code}`;
    if (value instanceof HTMLInputElement) value.value = code;

    menu?.querySelectorAll<HTMLElement>(".phone-prefix-option").forEach(option => {
      option.classList.toggle(
        "is-selected",
        option.dataset.code === code && option.dataset.country === countryCode,
      );
    });
  };

  const render = (control: PhonePrefixControl) => {
    if (control.ready || !(control.menu instanceof HTMLElement)) return;

    const fragment = document.createDocumentFragment();
    for (const [countryCode, code] of PHONE_PREFIXES) {
      fragment.append(createOption(countryCode, code, getCountryName(countryCode)));
    }
    control.menu.replaceChildren(fragment);
    control.ready = true;

    const selectedCode = control.value instanceof HTMLInputElement ? control.value.value : "+34";
    const selected = PHONE_PREFIXES.find(([, code]) => code === selectedCode) || PHONE_PREFIXES[0];
    select(control, selected[0], selected[1]);
  };

  for (const control of controls) {
    control.menu?.addEventListener("click", event => {
      const option = event.target instanceof Element
        ? event.target.closest<HTMLElement>(".phone-prefix-option")
        : null;
      if (!option?.dataset.country || !option.dataset.code) return;
      select(control, option.dataset.country, option.dataset.code);
      close(control);
    }, { signal });

    control.button?.addEventListener("click", () => {
      if (!(control.menu instanceof HTMLElement) || !(control.button instanceof HTMLButtonElement)) return;
      const willOpen = control.menu.hidden;
      if (willOpen) render(control);
      control.menu.hidden = !willOpen;
      control.button.setAttribute("aria-expanded", String(willOpen));
    }, { signal });
  }

  document.addEventListener("click", event => {
    if (!(event.target instanceof Node)) return;
    for (const control of controls) {
      if (control.select instanceof HTMLElement && !control.select.contains(event.target)) close(control);
    }
  }, { signal });

  return {
    closeAll() {
      controls.forEach(close);
    },
    refreshLabels() {
      countryNames = undefined;
      for (const control of controls) {
        control.menu?.querySelectorAll<HTMLElement>(".phone-prefix-option").forEach(option => {
          const country = option.querySelector(".phone-prefix-option-country");
          if (country && option.dataset.country) country.textContent = getCountryName(option.dataset.country);
        });
      }
    },
    dispose() {
      listeners.abort();
    },
  };
}
