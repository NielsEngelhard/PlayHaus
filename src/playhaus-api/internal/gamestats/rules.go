package gamestats

import "slices"

var counters = []Counter{
	LolWod, LolSolo, LolMultiplayer,
	QuizSingleDevice, QuizMultiDevice, QuizMultiDeviceWithHostScreen,
	OouSingleDevice, OouMultiDevice,
	FakeFiller, WittyWars,
}

// Valid gates the column name before it is spliced into SQL.
func (c Counter) Valid() bool {
	return slices.Contains(counters, c)
}
