## v0.2.4

- added auto-scaling and scaling via key combination
- direct was removed, and the translation for rules and global was replaced
- added icons for proxy groups on main page
- fixed log color when dark theme is enabled
- the alphabetical index has been removed, and additional information about proxies is now hidden by default
- notification of exceeding the number of devices in the subscription
- support for vless:// links with templates by @legiz-ru
- started the process of renaming to Koala Clash, replaced icons
- traffic information has been reworked on profile page

## v0.2.3

- fixed problem with profile inactivation after adding via deeplink on windows
- corrected layout on the proxy page, now all cards are the same size
- corrected announe transposition by \n
- corrected side menu in compressed window
- added check at the main toggle switch, now it cannot be enabled if there are no profiles.


## v0.2.1

- added headers "announce-url", "update-always"
- added a check for the presence of a profile, if it already exists, an update will be performed
- fixed processing of links for displaying telegram icon on the main page
- added profile update button on the main page

## v0.2

- added handlers for "Announe", "Support-Url", "New-Sub-Domain", "Profile-Title" headers:
  - for "Announce" and "Support-Url" added output of information on the main page
  - for "New-Sub-Domain" and "Profile-Title" added change of profile details when it is updated
- added mode switching for toggle switch on the main screen in settings
- now either tun mode or system proxy can be enabled, enabling one will disable the other
- fixed sticking of some modal windows to window frames
- the menu for adding a profile has been simplified, most of the settings are hidden behind the advanced settings button
- added notification that a profile needs to be added to start working
- corrected profile cards in the profiles section
- corrected display of flags in proxy names on Windows
- fixed display of proxy groups on the main page if they were not “Selector”

## v0.1

- rewritten interface from MUI to shadcn/ui
- rewritten main page:
  - one big power button and lists with proxy selection
  - notifications when no profiles are available or service needs to be installed
