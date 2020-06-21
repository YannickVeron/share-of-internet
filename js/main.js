var app = new Vue({
	el:'#app',
	data:{
		yearsLimits:{"min":1990,"max":2016},
		countries:{},
		selectedYear:1990,
		serie:null,
		displayMethod:"light",
		projection:'Miller',
		selectedCountry:"",
		editData:{"Entity":null,"Code":null,"Year":null,"Percentage":null}
	},
	mounted:function(){
		this.$http.get("/internet").then(function(response){
			let lastCode="-1"
			for(let countryYear of response.body){
				if(countryYear.Code!=lastCode){
					Vue.set(this.countries, countryYear.Code, {"Entity":countryYear.Entity,"Share":{[countryYear.Year]:countryYear.Percentage}} )
					lastCode=countryYear.Code
				}else{
					this.countries[countryYear.Code]["Share"][countryYear.Year]=countryYear.Percentage
				}
			}
			let mergedCodes = Object.keys(this.countries).join(';')
			this.$http.get("https://restcountries.eu/rest/v2/alpha?codes="+mergedCodes).then(function(response){
				for(let country of response.body){
					Object.assign(this.countries[country.alpha3Code], {"flag":country.flag,"latlng":country.latlng,"alpha2":country.alpha2Code});
				}
				//this.displayMap()
				this.initTable()
			})
		})
	},
	computed: {
	    lastData: function () {
	    	for(let country in this.countries){

	    	}
	    }
	},
	methods:{
		initTable(){
			let table  = $('#countryList').DataTable();
			table.destroy();
			table = $("#countryList").DataTable({
				order: [[1, 'asc']],
				"columnDefs": [{"orderable": false, "targets": 0 }],
				"pageLength": 20
			});
			let instance = this;
			$('#countryList tbody').on('click', 'tr', function () {

		        var data = table.row( this ).data();
		        if(instance.selectedCountry!=data[1]){
		        	instance.selectedCountry=data[1]
		        	instance.initDetailTable()
		        	Vue.nextTick(function(){
			        	$('html, body').animate({
				            scrollTop: $('#countryDetail').offset().top
				        },3000); 
				    })
		        }else{
		        	instance.selectedCountry=""
		        	$("#countryDetailCountainer").hide()
		        	$('#countryDetail').DataTable().destroy();
		        }
		    });
		},
		initDetailTable(){
			if($.fn.dataTable.isDataTable('#countryDetail')){
			    $('#countryDetail').DataTable().destroy();
			}
			let instance = this
			Vue.nextTick(function(){
				let detailTable = $("#countryDetail").DataTable({
					"columnDefs": [{
						"targets": 2,
						"orderable": false
					}]
				})
				$('#countryDetail tbody').on('click', 'tr', function () {
			        var data = detailTable.row(this).data();
			        instance.editData={"Entity":instance.countries[instance.selectedCountry].Entity,"Year":data[0],"Percentage":data[1],"Code":instance.selectedCountry}
			    });
		    	$("#countryDetailCountainer").show()
	    	})
		},
		getChart(id) {
		    return am4core.registry.baseSprites.find(c => c.htmlContainer.id === id)
		},
		getValueForYear(country,year){
			year = parseInt(year,10);
			for(let y=year;y>=this.yearsLimits.min;y--){
				if(country.Share.hasOwnProperty(y.toString())){
					return country.Share[y]
				}
			}
			return 0
		},
		getColor:function(value){
			//return {a:0.5,"r":(value/100)*255,"g":0,"b":0}
			let color =am4core.color({"r":0,"g":Math.round((value/100)*255),"b":0})
			return color
		},
		displayMap:function(){
			let oldChart = this.getChart("chartdiv")
			if(oldChart != null){
				oldChart.dispose()
			}

			am4core.useTheme(am4themes_dark);
			//am4core.useTheme(am4themes_animated);
			// Themes end

			var chart = am4core.create("chartdiv", am4maps.MapChart);// Create map instance
			chart.geodata = am4geodata_worldLow;// Set map definition
			chart.projection = new am4maps.projections[this.projection]();// Set projection
			if(this.projection=="Orthographic"){
				chart.panBehavior = "rotateLongLat";
			}
			var polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());// Create map polygon series
			polygonSeries.exclude = ["AQ"];// Exclude Antartica
			polygonSeries.useGeodata = true;// Make map load polygon (like country names) data from GeoJSON

			this.serie=polygonSeries;
			if(this.displayMethod=="full"||this.displayMethod=="optimized"){
				for(const code of Object.keys(this.countries)){
					//let val = this.countries[code].Share[Object.keys(this.countries[code].Share)[Object.keys(this.countries[code].Share).length-1]];
					let val = this.getValueForYear(this.countries[code],this.selectedYear)
					let color = this.getColor(val)
					polygonSeries.data.push({"id":this.countries[code].alpha2,"name":this.countries[code].name,"value":val,"fill":color,"alpha3":code})

				}
			}else if(this.displayMethod=="light"){
				var imageSeries = chart.series.push(new am4maps.MapImageSeries());
				imageSeries.mapImages.template.propertyFields.longitude = "longitude";
				imageSeries.mapImages.template.propertyFields.latitude = "latitude";
				//imageSeries.data = mapData;
				for(const code of Object.keys(this.countries)){
					//let val = this.countries[code].Share[Object.keys(this.countries[code].Share)[Object.keys(this.countries[code].Share).length-1]];
					let val = this.getValueForYear(this.countries[code],this.selectedYear)
					let color = this.getColor(val)
					if(this.countries[code].latlng!=null){
						imageSeries.data.push({"id":this.countries[code].alpha2,"name":this.countries[code].Entity,"value":val,"fill":color,"alpha3":code,'latitude':this.countries[code].latlng[0],'longitude':this.countries[code].latlng[1]})
					}
				}

				imageSeries.dataFields.value = "value";

				var imageTemplate = imageSeries.mapImages.template;
				imageTemplate.nonScaling = true

				var circle = imageTemplate.createChild(am4core.Circle);
				circle.fillOpacity = 0.7;
				circle.propertyFields.fill = "fill";
				circle.tooltipText = "{name} : [bold]{value}%[/]";

				imageSeries.heatRules.push({
				  "target": circle,
				  "property": "radius",
				  "min": 4,
				  "max": 30,
				  "dataField": "value"
				})
			}

			// Configure series
			var polygonTemplate = polygonSeries.mapPolygons.template;
			if(this.displayMethod=="full"){
				polygonTemplate.tooltipText = "{name} - {value}%";
			}else{
				polygonTemplate.tooltipText = "{name}";
			}
			polygonTemplate.polygon.fillOpacity = 0.6;
			chart.backgroundSeries.mapPolygons.template.polygon.fill = am4core.color("#aadaff");
			chart.backgroundSeries.mapPolygons.template.polygon.fillOpacity = 1;


			let onHit=(ev)=>{
				let anim = ev.target.series.chart.zoomToMapObject(ev.target);
				anim.events.on("animationended",(evt)=>{
					$('html, body').animate({
			            scrollTop: $('#countryDetail').offset().top
			        },3000);        
				})
				if(this.selectedCountry!=ev.target.dataItem.dataContext.alpha3){
					this.selectedCountry=ev.target.dataItem.dataContext.alpha3
					this.initDetailTable()
				}else{
					$("#countryDetailCountainer").hide()
					this.selectedCountry=""
				}
			}
			if(this.displayMethod=="light"){
				imageTemplate.cursorOverStyle = am4core.MouseCursorStyle.pointer
				imageTemplate.events.on("hit", (ev)=>{
					onHit(ev)
				});
			}else{
				polygonTemplate.cursorOverStyle = am4core.MouseCursorStyle.pointer
				polygonTemplate.propertyFields.fill = "fill";
				polygonTemplate.events.on("hit", (ev)=>{
					onHit(ev)
				});
			}


			if(this.displayMethod=="full"){
				// Create hover state and set alternative fill color
				var hs = polygonTemplate.states.create("hover");
				hs.properties.fill = chart.colors.getIndex(0);
			}

			var sliderContainer = chart.createChild(am4core.Container);
			sliderContainer.width = am4core.percent(100);
			sliderContainer.padding(0, 15, 15, 10);
			sliderContainer.layout = "horizontal";

			var slider = sliderContainer.createChild(am4core.Slider);
			slider.start = (this.selectedYear-this.yearsLimits.min)*(1/(this.yearsLimits.max-this.yearsLimits.min));
			slider.padding(20, 30, 0, 80);
			slider.background.padding(15, 30, 0, 80);
			//slider.marginBottom = 15;
			slider.events.on("rangechanged", ()=>{
				let year = Math.round(this.yearsLimits.min+(slider.start*(this.yearsLimits.max-this.yearsLimits.min)))
				if(year!=this.selectedYear){
					this.selectedYear=year
					if(this.displayMethod=="light"){
						this.updateMap(imageSeries)
					}else{
						this.updateMap(polygonSeries)
					}
				}
			})
			if(this.displayMethod=="optimized"){
				var playButton = sliderContainer.createChild(am4core.PlayButton);
				  playButton.valign = "middle";
				  //play button behavior
				  playButton.events.on("toggled", function(event) {
				  	let sliderAnimation;
				    if(event.target.isActive){
				      	if (!sliderAnimation) {
					    	sliderAnimation = slider.animate({ property: "start", to: 1, from: 0 }, 25000, am4core.ease.linear).pause();
					    	sliderAnimation.events.on("animationended", () => {
					        	playButton.isActive = false;
					    	})
					    }
					    if (slider.start >= 1) {
					    	slider.start = 0;
					    	sliderAnimation.start();
					    }
					    sliderAnimation.resume();
					    playButton.isActive = true;
				    }else{
				      	if(sliderAnimation) {
					    	sliderAnimation.pause();
					    }
					    playButton.isActive = false;
				    }
				})
			}
		},
		updateMap:function(serie){
			switch(this.displayMethod){
				case 'full':
					let data = []
					for (let i = serie.data.length - 1; i >= 0; i--) {
						if(serie.data[i].hasOwnProperty("alpha3")){
							let value = this.getValueForYear(this.countries[serie.data[i].alpha3],this.selectedYear)
							let color = this.getColor(value)
							data.push({"id":serie.data[i].id,"name":serie.data[i].name,"value":value,"fill":color,"alpha3":serie.data[i].alpha3})
						}
					}
					serie.data=data
				break;
				case 'optimized':
					for (let key of Object.keys(this.countries)) {
						let value = this.getValueForYear(this.countries[key],this.selectedYear)
						let color = this.getColor(value)
						serie.getPolygonById(this.countries[key].alpha2).fill=color
					}
				break;
				case 'light':
					let dataLight = []
					for (let i = serie.data.length - 1; i >= 0; i--) {
						if(serie.data[i].hasOwnProperty("alpha3")){
							let value = this.getValueForYear(this.countries[serie.data[i].alpha3],this.selectedYear)
							let color = this.getColor(value)
							dataLight.push({"id":serie.data[i].id,"name":serie.data[i].name,"value":value,"fill":color,"alpha3":serie.data[i].alpha3,'latitude':serie.data[i].latitude,'longitude':serie.data[i].longitude})
						}
					}
					serie.data=dataLight
				break;
				default:
					console.log("Unknow method")
			}
			
		},
		addEntry:function(){
			this.editData={"Entity":this.countries[this.selectedCountry].Entity,"Year":null,"Percentage":null,"Code":this.selectedCountry}
		},
		submitData:function(){
			this.$http.post("update",this.editData).then(function(response){
				document.location.reload(true);
			})
		},
		deleteYear:function(year){
			this.$http.post("delete",{"Code":this.selectedCountry,"Year":year}).then(function(response){
				document.location.reload(true);
			})
		}
	}
})